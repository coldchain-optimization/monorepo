"""
Cold Chain ML Inference Service
Exported from memory_optimized_route.ipynb
Serves ML predictions for shipment-vehicle matching

Integrates with LoopLink backend to provide:
- Match scoring between shipments and vehicles
- Dynamic pricing based on route characteristics
- Route optimization with multi-stop support
- Backhaul matching for return cargo
"""

from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import logging
import json
import re
import math
import os
from typing import Dict, Any, Optional
from sklearn.preprocessing import MinMaxScaler

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Configuration & Data Paths (CSV files optional)
# ============================================================================

TRIPS_PATH = os.getenv('TRIPS_CSV', 'Delivery_truck_trip_data.csv')
TOLLS_PATH = os.getenv('TOLLS_CSV', 'tolls-with-metadata.csv')
DIESEL_PATH = os.getenv('DIESEL_CSV', 'all_india_live_diesel.csv')

BEST_PARAMS = {
    'fuel_eff':            0.35,
    'refrig_rs_hr':        180,
    'avg_speed_kmh':       50,
    'driver_cost_per_day': 3000,
    'km_per_driver_day':   400,
    'truck_capacity_tons': 20,
    'demand_weight':       0.15,
    'dwell_penalty_rate':  0.01,
    'free_dwell_min':      60,
    'margin':              0.18,
}

EFFICIENCY_WEIGHTS = {
    'cost':  0.45,
    'time':  0.35,
    'delay_risk': 0.20,
}

lane_graph = pd.DataFrame()
MEDIAN_DIESEL = 90.0
MEDIAN_TOLL_RATE = 2.5


def initialize_graph():
    global lane_graph, MEDIAN_DIESEL, MEDIAN_TOLL_RATE
    try:
        logger.info("Loading mapping data for Route/Backhaul...")

        # Check if CSV files exist
        trips_exists = os.path.exists(TRIPS_PATH)
        diesel_exists = os.path.exists(DIESEL_PATH)
        tolls_exists = os.path.exists(TOLLS_PATH)

        if not (trips_exists and diesel_exists and tolls_exists):
            logger.warning(
                f"CSV files missing: trips={trips_exists}, diesel={diesel_exists}, tolls={tolls_exists}. "
                f"Using fallback values. Provide CSV files to enable route optimization."
            )
            return _initialize_fallback_data()

        df_trips = pd.read_csv(TRIPS_PATH)
        df_diesel = pd.read_csv(DIESEL_PATH)
        df_tolls = pd.read_csv(TOLLS_PATH)

        def parse_rates(s):
            try:
                return json.loads(s)
            except:
                return {}

        rates_exp = df_tolls['rates'].apply(parse_rates).apply(pd.Series)
        df_tolls = pd.concat(
            [df_tolls.drop(columns=['rates']), rates_exp], axis=1)
        df_tolls['multiaxle_single'] = pd.to_numeric(
            df_tolls['multiaxle_single'], errors='coerce')
        MEDIAN_TOLL_RATE = df_tolls['multiaxle_single'].median()

        df_diesel['city_norm'] = df_diesel['city'].str.strip().str.title()
        DIESEL_DICT = dict(zip(df_diesel['city_norm'], df_diesel['price']))
        MEDIAN_DIESEL = df_diesel['price'].median()

        def get_diesel(city): return DIESEL_DICT.get(
            str(city).title(), MEDIAN_DIESEL)

        trips = df_trips.rename(
            columns={'TRANSPORTATION_DISTANCE_IN_KM': 'distance_km'}).copy()
        trips = trips[trips['distance_km'].notna() & (
            trips['distance_km'] > 0)].copy()

        def extract_city(s):
            if pd.isna(s):
                return 'Unknown'
            parts = [p.strip() for p in str(s).split(',')]
            return parts[-2].title() if len(parts) >= 2 else parts[0].title()

        def extract_cap(s):
            m = re.search(r'(\d+(?:\.\d+)?)\s*MT', str(s), re.I)
            return float(m.group(1)) if m and 1 <= float(m.group(1)) <= 40 else 20.0

        def parse_latlon(s):
            try:
                p = str(s).split(',')
                return float(p[0].strip()), float(p[1].strip())
            except:
                return None, None

        trips['origin_city'] = trips['Origin_Location'].apply(extract_city)
        trips['dest_city'] = trips['Destination_Location'].apply(extract_city)
        trips['lane'] = trips['OriginLocation_Code'].str.strip(
        ) + '_' + trips['DestinationLocation_Code'].str.strip()
        trips['org_code'] = trips['OriginLocation_Code'].str.strip()
        trips['des_code'] = trips['DestinationLocation_Code'].str.strip()
        trips['load_tons'] = trips['vehicleType'].apply(extract_cap) * 0.80
        trips['fuel_price'] = trips['origin_city'].apply(get_diesel)
        trips['toll_cost'] = (trips['distance_km'] /
                              100).round() * MEDIAN_TOLL_RATE
        trips['trip_start_dt'] = pd.to_datetime(
            trips['trip_start_date'], errors='coerce')
        trips['planned_eta_dt'] = pd.to_datetime(
            trips['Planned_ETA'], errors='coerce')
        trips['actual_eta_dt'] = pd.to_datetime(
            trips['actual_eta'],  errors='coerce')
        trips['dwell_min'] = ((trips['actual_eta_dt'] - trips['planned_eta_dt']
                               ).dt.total_seconds() / 60).clip(lower=0).fillna(0)
        trips['delay_flag'] = (~(trips['ontime'] == 'G')).astype(int)
        trips['hour_of_day'] = trips['trip_start_dt'].dt.hour
        trips['month'] = trips['trip_start_dt'].dt.month
        trips['is_peak_hour'] = trips['hour_of_day'].apply(
            lambda h: 1 if (6 <= h < 10 or 17 <= h < 21) else 0)
        trips['is_peak_season'] = trips['month'].apply(
            lambda m: 1 if m in [4, 5, 6] else 0)

        trips[['org_lat', 'org_lon']] = trips['Org_lat_lon'].apply(
            lambda x: pd.Series(parse_latlon(x)))
        trips[['des_lat', 'des_lon']] = trips['Des_lat_lon'].apply(
            lambda x: pd.Series(parse_latlon(x)))

        lane_graph_temp = (
            trips.groupby(['org_code', 'des_code', 'lane'])
            .agg(
                trip_count=('BookingID',     'count'),
                avg_distance_km=('distance_km',   'mean'),
                avg_load_tons=('load_tons',     'mean'),
                avg_dwell_min=('dwell_min',     'mean'),
                delay_rate=('delay_flag',    'mean'),
                avg_fuel_price=('fuel_price',    'mean'),
                avg_toll_cost=('toll_cost',     'mean'),
                origin_city=('origin_city',   'first'),
                dest_city=('dest_city',     'first'),
                avg_org_lat=('org_lat',       'mean'),
                avg_org_lon=('org_lon',       'mean'),
                avg_des_lat=('des_lat',       'mean'),
                avg_des_lon=('des_lon',       'mean'),
            ).reset_index()
        )

        lane_graph_temp['lane_popularity'] = (np.log1p(
            lane_graph_temp['trip_count']) / np.log1p(lane_graph_temp['trip_count'].max()))
        lane_graph_temp['est_travel_hrs'] = lane_graph_temp['avg_distance_km'] / \
            BEST_PARAMS['avg_speed_kmh']
        lane_graph_temp['est_total_hrs'] = lane_graph_temp['est_travel_hrs'] + \
            lane_graph_temp['avg_dwell_min'] / 60

        price_cols = lane_graph_temp.apply(
            lambda r: pd.Series(compute_trip_price({
                'distance_km':   r['avg_distance_km'],
                'load_tons':     r['avg_load_tons'],
                'fuel_price':    r['avg_fuel_price'],
                'toll_cost':     r['avg_toll_cost'],
                'dwell_min':     r['avg_dwell_min'],
                'lane_popularity': r['lane_popularity'],
                'is_peak_hour':  0, 'is_peak_season': 0,
            })), axis=1
        )
        lane_graph = pd.concat([lane_graph_temp, price_cols], axis=1)
        logger.info(f"Lane graph loaded: {len(lane_graph)} routes.")
    except Exception as e:
        logger.warning(f"Could not initialize lane graph: {e}")
        _initialize_fallback_data()


def _initialize_fallback_data():
    """Initialize with fallback synthetic data when CSVs are missing"""
    global lane_graph, MEDIAN_DIESEL, MEDIAN_TOLL_RATE
    logger.info("Using fallback synthetic lane graph data")
    MEDIAN_DIESEL = 90.0
    MEDIAN_TOLL_RATE = 2.5
    # Lane graph remains empty DataFrame - route optimization will not work
    # but /optimize endpoint for match scoring will still function


def compute_trip_price(row, params=None):
    if params is None:
        params = BEST_PARAMS
    dist = float(row.get('distance_km', 0))
    load = float(row.get('load_tons', params['truck_capacity_tons'] * 0.8))
    cap = float(row.get('truck_capacity_tons', params['truck_capacity_tons']))
    diesel = float(row.get('fuel_price', MEDIAN_DIESEL))
    toll = float(row.get('toll_cost', (dist/100) * MEDIAN_TOLL_RATE))
    dwell = float(row.get('dwell_min', 0))

    fuel_cost = dist * params['fuel_eff'] * diesel
    refrig_cost = (dist / params['avg_speed_kmh']) * params['refrig_rs_hr']
    driver_cost = (dist / params['km_per_driver_day']
                   ) * params['driver_cost_per_day']
    base_cost = fuel_cost + refrig_cost + driver_cost + toll

    lane_pop = float(row.get('lane_popularity', 0.5))
    alpha = 1.0 + params['demand_weight'] * lane_pop
    load_util = min(load / max(cap, 1), 1.0)
    beta = 1.0 if load_util >= 0.5 else 0.80 + 0.40 * load_util
    idle_hrs = max(0, (dwell - params['free_dwell_min']) / 60)
    gamma = 1.0 + idle_hrs * params['dwell_penalty_rate']
    delta = 1.0 + 0.10 * int(row.get('is_peak_hour', 0)) + \
        0.08 * int(row.get('is_peak_season', 0))

    trip_price = base_cost * alpha * beta * \
        gamma * delta * (1 + params['margin'])
    return {
        'base_cost':       round(base_cost, 2),
        'trip_price_rs':   round(trip_price, 2),
        'price_per_ton_km': round(trip_price / max(dist * load, 1), 4),
        'alpha': round(alpha, 3), 'beta': round(beta, 3),
        'gamma': round(gamma, 3), 'delta': round(delta, 3),
    }


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def bearing_deg(lat1, lon1, lat2, lon2):
    dlon = math.radians(lon2 - lon1)
    lat1r, lat2r = math.radians(lat1), math.radians(lat2)
    x = math.sin(dlon) * math.cos(lat2r)
    y = math.cos(lat1r)*math.sin(lat2r) - math.sin(lat1r) * \
        math.cos(lat2r)*math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def angle_diff(a, b):
    diff = abs(a - b) % 360
    return diff if diff <= 180 else 360 - diff


def optimize_routes(origin_code, dest_code, load_tons=15.0, max_stops=1, top_n=5, weights=None, params=None):
    if weights is None:
        weights = EFFICIENCY_WEIGHTS
    if params is None:
        params = BEST_PARAMS
    options = []

    def get_lane(o, d):
        rows = lane_graph[(lane_graph['org_code'] == o) &
                          (lane_graph['des_code'] == d)]
        return rows.iloc[0] if len(rows) > 0 else None

    def price_segment(lane_row, load):
        return compute_trip_price({
            'distance_km':    lane_row['avg_distance_km'],
            'load_tons':      load,
            'fuel_price':     lane_row['avg_fuel_price'],
            'toll_cost':      lane_row['avg_toll_cost'],
            'dwell_min':      lane_row['avg_dwell_min'],
            'lane_popularity': lane_row['lane_popularity'],
            'is_peak_hour':   0, 'is_peak_season': 0,
        }, params)
    direct = get_lane(origin_code, dest_code)
    if direct is not None:
        p = price_segment(direct, load_tons)
        options.append({
            'route_type':    'Direct',
            'stops':         f"{direct['origin_city']} → {direct['dest_city']}",
            'n_stops':       0,
            'total_dist_km': round(direct['avg_distance_km'], 1),
            'est_time_hrs':  round(direct['est_total_hrs'], 1),
            'trip_price_rs': p['trip_price_rs'],
            'price_per_ton_km': p['price_per_ton_km'],
            'delay_risk_pct': round(direct['delay_rate'] * 100, 1),
            'lane_segments': 1,
            'base_cost':     p['base_cost'],
            'org_lat': direct['avg_org_lat'], 'org_lon': direct['avg_org_lon'],
            'des_lat': direct['avg_des_lat'], 'des_lon': direct['avg_des_lon'],
            'via': None,
        })
    if max_stops >= 1:
        from_origin = lane_graph[lane_graph['org_code']
                                 == origin_code]['des_code'].unique()
        to_dest = lane_graph[lane_graph['des_code']
                             == dest_code]['org_code'].unique()
        hubs = set(from_origin) & set(to_dest)
        for hub in hubs:
            leg1, leg2 = get_lane(origin_code, hub), get_lane(hub, dest_code)
            if leg1 is None or leg2 is None:
                continue
            p1, p2 = price_segment(
                leg1, load_tons), price_segment(leg2, load_tons)
            total_dist = leg1['avg_distance_km'] + leg2['avg_distance_km']
            total_time = leg1['est_total_hrs'] + leg2['est_total_hrs'] + 2
            total_price = p1['trip_price_rs'] + p2['trip_price_rs']
            combined_delay = 1 - \
                (1 - leg1['delay_rate']) * (1 - leg2['delay_rate'])
            hub_city = lane_graph[lane_graph['des_code'] == hub]['dest_city'].iloc[0] if len(
                lane_graph[lane_graph['des_code'] == hub]) > 0 else hub
            options.append({
                'route_type':    '1-Stop',
                'stops':         f"{leg1['origin_city']} → {hub_city} → {leg2['dest_city']}",
                'n_stops':       1,
                'total_dist_km': round(total_dist, 1),
                'est_time_hrs':  round(total_time, 1),
                'trip_price_rs': round(total_price, 2),
                'price_per_ton_km': round(total_price / max(total_dist * load_tons, 1), 4),
                'delay_risk_pct': round(combined_delay * 100, 1),
                'lane_segments': 2,
                'base_cost':     round(p1['base_cost'] + p2['base_cost'], 2),
                'org_lat': leg1['avg_org_lat'], 'org_lon': leg1['avg_org_lon'],
                'des_lat': leg2['avg_des_lat'], 'des_lon': leg2['avg_des_lon'],
                'via': hub_city,
            })
    if not options:
        return []
    df = pd.DataFrame(options)
    scaler = MinMaxScaler()
    metrics = df[['trip_price_rs', 'est_time_hrs', 'delay_risk_pct']].copy()
    for col in metrics.columns:
        if metrics[col].nunique() == 1:
            metrics[col] = 0.5
    scaled = scaler.fit_transform(metrics) if len(
        df) > 1 else np.array([[0.5, 0.5, 0.5]])
    df['score_cost'] = scaled[:, 0]
    df['score_time'] = scaled[:, 1]
    df['score_delay'] = scaled[:, 2]
    df['efficiency_score'] = (weights['cost'] * df['score_cost'] + weights['time']
                              * df['score_time'] + weights['delay_risk'] * df['score_delay']).round(4)
    df['rank'] = df['efficiency_score'].rank(method='min').astype(int)
    return df.sort_values('rank').head(top_n).replace({np.nan: None}).to_dict(orient='records')


def find_backhaul_matches(current_location_code, home_location_code, max_detour_km=150, direction_tol_deg=90, min_load_tons=3.0, top_n=8, params=None):
    if params is None:
        params = BEST_PARAMS
    available_cargo_df = lane_graph
    cur_rows = lane_graph[lane_graph['org_code'] == current_location_code]
    if cur_rows.empty:
        cur_rows = lane_graph[lane_graph['des_code'] == current_location_code]
        lat_col, lon_col = 'avg_des_lat', 'avg_des_lon'
    else:
        lat_col, lon_col = 'avg_org_lat', 'avg_org_lon'
    if cur_rows.empty:
        return []

    cur_lat, cur_lon = cur_rows.iloc[0][lat_col], cur_rows.iloc[0][lon_col]
    home_rows = lane_graph[lane_graph['org_code'] == home_location_code]
    home_lat, home_lon = (home_rows.iloc[0]['avg_org_lat'], home_rows.iloc[0]
                          ['avg_org_lon']) if not home_rows.empty else (cur_lat - 2, cur_lon - 2)

    home_bearing = bearing_deg(cur_lat, cur_lon, home_lat, home_lon)
    direct_home_dist = haversine_km(
        cur_lat, cur_lon, home_lat, home_lon) * 1.25
    empty_run_cost = direct_home_dist * params['fuel_eff'] * MEDIAN_DIESEL

    matches = []
    for _, cargo in available_cargo_df.iterrows():
        if cargo.get('avg_load_tons', 0) < min_load_tons:
            continue
        pickup_lat, pickup_lon = cargo.get(
            'avg_org_lat'), cargo.get('avg_org_lon')
        dropoff_lat, dropoff_lon = cargo.get(
            'avg_des_lat'), cargo.get('avg_des_lon')
        if any(pd.isna(x) for x in [pickup_lat, pickup_lon, dropoff_lat, dropoff_lon]):
            continue

        detour_km = haversine_km(
            cur_lat, cur_lon, pickup_lat, pickup_lon) * 1.25
        if detour_km > max_detour_km:
            continue

        dir_diff = angle_diff(bearing_deg(
            pickup_lat, pickup_lon, dropoff_lat, dropoff_lon), home_bearing)
        if dir_diff > direction_tol_deg:
            continue

        bh_price = compute_trip_price({'distance_km': cargo['avg_distance_km'], 'load_tons': cargo['avg_load_tons'], 'fuel_price': cargo.get('avg_fuel_price', MEDIAN_DIESEL), 'toll_cost': cargo.get(
            'avg_toll_cost', 0), 'dwell_min': cargo.get('avg_dwell_min', 0), 'lane_popularity': cargo.get('lane_popularity', 0.3), 'is_peak_hour': 0, 'is_peak_season': 0}, params)
        detour_fuel_cost = detour_km * params['fuel_eff'] * MEDIAN_DIESEL
        net_profit = bh_price['trip_price_rs'] - \
            detour_fuel_cost - empty_run_cost
        util_pct = min(cargo['avg_load_tons'] /
                       params['truck_capacity_tons'], 1.0) * 100

        matches.append({
            'cargo_lane':        cargo['lane'],
            'pickup_city':       cargo['origin_city'],
            'dropoff_city':      cargo['dest_city'],
            'detour_km':         round(detour_km, 1),
            'cargo_dist_km':     round(cargo['avg_distance_km'], 1),
            'load_tons':         round(cargo['avg_load_tons'], 1),
            'util_pct':          round(util_pct, 1),
            'backhaul_price_rs': bh_price['trip_price_rs'],
            'detour_cost_rs':    round(detour_fuel_cost, 2),
            'net_profit_rs':     round(net_profit, 2),
            'delay_risk_pct':    round(cargo['delay_rate'] * 100, 1),
            'direction_match_deg': round(dir_diff, 1),
            'est_time_hrs':      round(cargo['est_total_hrs'] + detour_km / params['avg_speed_kmh'], 1),
        })

    if not matches:
        return []
    df = pd.DataFrame(matches).sort_values(['net_profit_rs', 'detour_km'], ascending=[
        False, True]).head(top_n).reset_index(drop=True)
    df.insert(0, 'rank', range(1, len(df)+1))
    return df.replace({np.nan: None}).to_dict(orient='records')

# ============================================================================
# Feature Computation (from notebook)
# ============================================================================


def compute_spoilage_risk(shipment: Dict[str, Any]) -> float:
    """Compute spoilage risk from shipment features (0-1 range)"""
    risk = 0.0

    # Temperature requirement adds risk
    required_temp = shipment.get('required_temp', -1)
    if required_temp != -1:
        risk += 0.45

    # Load type indicates perishability
    load_type = str(shipment.get('load_type', '')).lower().strip()
    if any(x in load_type for x in ['perish', 'dairy', 'fruit', 'vegetable', 'meat', 'fish', 'frozen']):
        risk += 0.25

    # Time pressure
    days = shipment.get('days_available', 1)
    if days <= 1:
        risk += 0.30
    elif days <= 3:
        risk += 0.15

    return min(1.0, risk)


def compute_capacity_score(shipment: Dict[str, Any], vehicle: Dict[str, Any]) -> float:
    """
    Compute how well vehicle capacity matches shipment load (0-1 range)
    Good utilization is 20-80% (not too empty, not overloaded)
    """
    load_weight = float(shipment.get('load_weight', 0))
    load_volume = float(shipment.get('load_volume', 0))
    capacity = float(vehicle.get('capacity', 1))
    max_weight = float(vehicle.get('max_weight', 1))

    # Normalize both dimensions to 0-1
    vol_util = min(1.0, load_volume / max(capacity, 1))
    weight_util = min(1.0, load_weight / max(max_weight, 1))

    # Average utilization
    avg_util = (vol_util + weight_util) / 2.0

    if avg_util < 0.20:
        # Penalty for underutilization
        return max(0.0, 0.5 - (0.20 - avg_util) * 2)
    elif avg_util > 0.80:
        # Penalty for overutilization
        return max(0.0, 1.0 - (avg_util - 0.80) * 2)
    else:
        # Score range 0.7-1.0 for good utilization
        return 0.7 + ((avg_util - 0.20) / 0.60) * 0.3


def compute_temp_match_score(shipment: Dict[str, Any], vehicle: Dict[str, Any]) -> float:
    """Check if vehicle temperature capability matches shipment requirement (0-1)"""
    required_temp = shipment.get('required_temp', -1)

    # No temperature requirement = perfect match
    if required_temp == -1:
        return 1.0

    is_refrigerated = vehicle.get('is_refrigerated', False)
    if not is_refrigerated:
        return 0.0  # Non-refrigerated vehicle can't handle cold shipment

    vehicle_temp = float(vehicle.get('temperature', 20))
    temp_diff = abs(float(vehicle_temp) - float(required_temp))

    # Perfect match = 1.0, each degree off = -0.05
    score = max(0.0, 1.0 - (temp_diff * 0.05))
    return score


def compute_distance_penalty(route: Optional[Dict[str, Any]]) -> float:
    """Penalize long distances (prefer shorter routes) (0-1 range)"""
    distance_km = route.get('distance_km', 300) if route else 300

    # Base penalty at 300km, increases with distance
    # 0km = 1.0, 300km = 0.7, 600km = 0.4
    return max(0.0, 1.0 - (float(distance_km) / 1000.0))


def compute_time_penalty(route: Optional[Dict[str, Any]], shipment: Dict[str, Any]) -> float:
    """Penalize if route time exceeds available time window (0-1 range)"""
    if not route:
        return 0.8  # Neutral penalty if no route data

    estimated_time = float(route.get('estimated_time', 24 * 60))  # in minutes
    available_hours = float(shipment.get('days_available', 1)) * 24
    available_minutes = available_hours * 60

    # If we can deliver early = bonus
    # If we can just barely make it = neutral
    # If we can't make it = penalty
    time_ratio = estimated_time / available_minutes

    if time_ratio < 0.3:
        return 1.0  # Plenty of time
    elif time_ratio > 1.0:
        return 0.0  # Can't make deadline
    else:
        return 1.0 - (time_ratio - 0.3) / 0.7


def compute_carbon_efficiency(route: Optional[Dict[str, Any]], vehicle: Dict[str, Any]) -> float:
    """Score based on carbon footprint efficiency (0-1 range)"""
    if not route or not vehicle:
        return 0.7

    carbon_kg = float(route.get('carbon_kg', 50))
    distance_km = float(route.get('distance_km', 300))

    # Carbon per km
    carbon_per_km = carbon_kg / max(distance_km, 1)
    vehicle_carbon = float(vehicle.get('carbon_footprint', 2.5))

    # If vehicle efficiency is good relative to route
    efficiency_ratio = vehicle_carbon / max(carbon_per_km, 0.1)

    # Normalize: ratio 1.0 = good match = 0.8 score
    return min(1.0, 0.5 + min(0.5, efficiency_ratio / 5.0))


# ============================================================================
# Main Scoring Logic
# ============================================================================

def compute_match_score(
    rule_score: float,
    shipment: Dict[str, Any],
    vehicle: Dict[str, Any],
    route: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Compute ML match score using weighted combination of factors

    All input factors are normalized to 0-1 range
    Output score is 0-100 with confidence 0-1
    """

    # Compute individual factors (all 0-1 range)
    spoilage_risk = compute_spoilage_risk(shipment)
    capacity_score = compute_capacity_score(shipment, vehicle)
    temp_match = compute_temp_match_score(shipment, vehicle)
    distance_penalty = compute_distance_penalty(route)
    time_penalty = compute_time_penalty(route, shipment)
    carbon_score = compute_carbon_efficiency(route, vehicle)

    # Weighted combination (emphasize cold chain & practical constraints)
    ml_score = (
        (1.0 - spoilage_risk) * 0.25 +  # Lower spoilage risk = higher score
        capacity_score * 0.20 +
        temp_match * 0.25 +              # Temperature match is critical
        distance_penalty * 0.10 +
        time_penalty * 0.10 +
        carbon_score * 0.10
    )

    # Convert to 0-100 scale
    ml_score_100 = ml_score * 100

    # Confidence based on feature completeness
    feature_completeness = 1.0
    if not route:
        feature_completeness -= 0.10
    if shipment.get('required_temp', -1) == -1:
        feature_completeness -= 0.05

    confidence = max(0.60, feature_completeness * 0.95)  # Min 60% confidence

    # Generate explanation
    explanations = []
    if capacity_score > 0.85:
        explanations.append("excellent capacity utilization")
    elif capacity_score < 0.5:
        explanations.append("suboptimal capacity match")

    if temp_match == 1.0:
        explanations.append("temperature control perfectly aligned")
    elif temp_match == 0.0:
        explanations.append("vehicle cannot meet temperature requirements")
    elif temp_match > 0.8:
        explanations.append("very good temperature compatibility")

    if distance_penalty > 0.8:
        explanations.append("efficient short-distance route")
    elif distance_penalty < 0.5:
        explanations.append("long distance may increase costs")

    if time_penalty == 1.0:
        explanations.append("plenty of time to deliver")
    elif time_penalty < 0.5:
        explanations.append("tight delivery timeline")

    explanation = "Match quality driven by: " + \
        "; ".join(explanations) if explanations else "Model-based match assessment"

    return {
        'ml_score': round(ml_score_100, 2),
        'confidence': round(confidence, 3),
        'explanation': explanation,
        'factors': {
            'spoilage_mitigation': round((1.0 - spoilage_risk) * 100, 2),
            'capacity_efficiency': round(capacity_score * 100, 2),
            'temperature_alignment': round(temp_match * 100, 2),
            'route_distance': round(distance_penalty * 100, 2),
            'time_fit': round(time_penalty * 100, 2),
            'carbon_efficiency': round(carbon_score * 100, 2)
        }
    }


# ============================================================================
# Flask Endpoints
# ============================================================================

@app.route('/optimize', methods=['POST'])
def optimize():
    """
    Main ML inference endpoint for shipment-vehicle matching

    Accepts LoopLink backend payload with:
    - rule_score: pre-computed rule-based score (0-100)
    - shipment: shipment features (id, load_weight, load_volume, required_temp, load_type, days_available)
    - vehicle: vehicle features (id, capacity, max_weight, is_refrigerated, temperature, carbon_footprint)
    - route: route data (distance_km, estimated_time, carbon_kg, cost_estimate) [optional]
    - engineered_features: pre-computed features [optional]

    Returns ML predictions with:
    - ml_score: 0-100 match score
    - confidence: 0-1 model confidence
    - explanation: human-readable explanation
    - factors: component score breakdown
    """
    try:
        data = request.json
        if not data:
            return jsonify({
                'error': 'Empty request body',
                'ml_score': 50.0,
                'confidence': 0.5,
                'explanation': 'Invalid input'
            }), 400

        # Extract backend payload
        rule_score = float(data.get('rule_score', 70.0))

        shipment_data = data.get('shipment', {})
        vehicle_data = data.get('vehicle', {})
        route_data = data.get('route', None)

        # Convert flat JSON to internal format
        shipment = {
            'id': shipment_data.get('id', 'unknown'),
            'load_weight': float(shipment_data.get('load_weight', 5.0)),
            'load_volume': float(shipment_data.get('load_volume', 10.0)),
            'required_temp': int(shipment_data.get('required_temp', -1)),
            'load_type': str(shipment_data.get('load_type', 'general')).lower(),
            'days_available': int(shipment_data.get('days_available', 2))
        }

        vehicle = {
            'id': vehicle_data.get('id', 'unknown'),
            'capacity': float(vehicle_data.get('capacity', 20.0)),
            'max_weight': float(vehicle_data.get('max_weight', 20.0)),
            'is_refrigerated': bool(vehicle_data.get('is_refrigerated', False)),
            'temperature': int(vehicle_data.get('temperature', 20)),
            'carbon_footprint': float(vehicle_data.get('carbon_footprint', 2.5))
        }

        route = None
        if route_data:
            route = {
                'distance_km': float(route_data.get('distance_km', 300)),
                # minutes
                'estimated_time': int(route_data.get('estimated_time', 480)),
                'carbon_kg': float(route_data.get('carbon_kg', 50)),
                'cost_estimate': float(route_data.get('cost_estimate', 1500))
            }

        # Compute ML score
        result = compute_match_score(rule_score, shipment, vehicle, route)

        logger.info(
            f"[OPTIMIZE] shipment={shipment['id']}, vehicle={vehicle['id']}, "
            f"score={result['ml_score']:.1f}, confidence={result['confidence']:.2f}"
        )

        return jsonify(result), 200

    except ValueError as e:
        logger.error(f"[OPTIMIZE] Value error: {str(e)}", exc_info=True)
        return jsonify({
            'error': f'Invalid parameter value: {str(e)}',
            'ml_score': 50.0,
            'confidence': 0.5,
            'explanation': 'Parameter validation failed'
        }), 400

    except Exception as e:
        logger.error(f"[OPTIMIZE] Inference error: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'ml_score': 50.0,
            'confidence': 0.5,
            'explanation': 'Error during inference; using neutral score'
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    graph_status = "initialized" if not lane_graph.empty else "fallback (csv files missing)"
    return jsonify({
        'status': 'ok',
        'service': 'cold-chain-ml',
        'version': '1.0',
        'graph_status': graph_status,
        'endpoints': {
            'POST /optimize': 'ML match scoring (primary)',
            'POST /price': 'Dynamic pricing (requires CSV)',
            'POST /optimize_route': 'Route optimization (requires CSV)',
            'POST /find_backhaul': 'Backhaul matching (requires CSV)',
            'GET /health': 'Health check'
        }
    }), 200


@app.route('/debug', methods=['POST'])
def debug():
    """Debug endpoint to see feature breakdown for a request"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'Empty request body'}), 400

        shipment_data = data.get('shipment', {})
        vehicle_data = data.get('vehicle', {})
        route_data = data.get('route', None)

        # Convert to internal format
        shipment = {
            'id': shipment_data.get('id', 'unknown'),
            'load_weight': float(shipment_data.get('load_weight', 5.0)),
            'load_volume': float(shipment_data.get('load_volume', 10.0)),
            'required_temp': int(shipment_data.get('required_temp', -1)),
            'load_type': str(shipment_data.get('load_type', 'general')).lower(),
            'days_available': int(shipment_data.get('days_available', 2))
        }

        vehicle = {
            'id': vehicle_data.get('id', 'unknown'),
            'capacity': float(vehicle_data.get('capacity', 20.0)),
            'max_weight': float(vehicle_data.get('max_weight', 20.0)),
            'is_refrigerated': bool(vehicle_data.get('is_refrigerated', False)),
            'temperature': int(vehicle_data.get('temperature', 20)),
            'carbon_footprint': float(vehicle_data.get('carbon_footprint', 2.5))
        }

        route = None
        if route_data:
            route = {
                'distance_km': float(route_data.get('distance_km', 300)),
                'estimated_time': int(route_data.get('estimated_time', 480)),
                'carbon_kg': float(route_data.get('carbon_kg', 50)),
                'cost_estimate': float(route_data.get('cost_estimate', 1500))
            }

        return jsonify({
            'shipment_analysis': {
                'spoilage_risk': round(compute_spoilage_risk(shipment), 3),
                'requires_refrigeration': shipment['required_temp'] != -1,
                'temperature_required': shipment['required_temp']
            },
            'vehicle_analysis': {
                'capacity_score': round(compute_capacity_score(shipment, vehicle), 3),
                'temp_match': round(compute_temp_match_score(shipment, vehicle), 3),
                'is_refrigerated': vehicle['is_refrigerated']
            },
            'route_analysis': {
                'distance_penalty': round(compute_distance_penalty(route), 3),
                'time_penalty': round(compute_time_penalty(route, shipment), 3),
                'carbon_efficiency': round(compute_carbon_efficiency(route, vehicle), 3)
            }
        }), 200
    except Exception as e:
        logger.error(f"[DEBUG] Error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/price', methods=['POST'])
def get_price():
    """Dynamic pricing endpoint"""
    try:
        req = request.json
        price_result = compute_trip_price({
            'distance_km': req.get('distance_km', 0),
            'load_tons': req.get('load_tons', 15),
            'fuel_price': req.get('fuel_price', MEDIAN_DIESEL),
            'toll_cost': req.get('toll_cost', 0),
            'dwell_min': req.get('dwell_min', 0),
            'lane_popularity': req.get('lane_popularity', 0.5),
            'is_peak_hour': req.get('is_peak_hour', 0),
            'is_peak_season': req.get('is_peak_season', 0)
        })
        return jsonify(price_result)
    except Exception as e:
        logger.error(f"Pricing error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/optimize_route', methods=['POST'])
def api_optimize_route():
    """Route optimization endpoint"""
    try:
        req = request.json
        origin = req.get('origin_code')
        dest = req.get('dest_code')
        load = float(req.get('load_tons', 15.0))
        stops = int(req.get('max_stops', 1))

        result = optimize_routes(origin, dest, load, stops)
        return jsonify({'routes': result})
    except Exception as e:
        logger.error(str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/find_backhaul', methods=['POST'])
def api_find_backhaul():
    """Backhaul matching endpoint"""
    try:
        req = request.json
        current = req.get('current_location_code')
        home = req.get('home_location_code')
        detour = float(req.get('max_detour_km', 150))

        result = find_backhaul_matches(current, home, max_detour_km=detour)
        return jsonify({'matches': result})
    except Exception as e:
        logger.error(str(e))
        return jsonify({'error': str(e)}), 500


@app.route('/trip_analytics', methods=['POST'])
def trip_analytics():
    """Trip analytics endpoint - returns trip options with detailed graphs data"""
    try:
        req = request.json
        origin = req.get('origin_code')
        dest = req.get('dest_code')
        load = float(req.get('load_tons', 15.0))

        if not origin or not dest:
            return jsonify({'error': 'origin_code and dest_code required'}), 400

        # Get route options
        routes = optimize_routes(
            origin, dest, load_tons=load, max_stops=1, top_n=5)

        if not routes:
            return jsonify({
                'routes': [],
                'summary': {
                    'avg_price': 0,
                    'min_price': 0,
                    'max_price': 0,
                    'best_route': None
                }
            }), 200

        # Calculate summary stats
        prices = [r.get('trip_price_rs', 0) for r in routes]
        times = [r.get('est_time_hrs', 0) for r in routes]
        costs_per_ton_km = [r.get('price_per_ton_km', 0) for r in routes]

        return jsonify({
            'routes': routes,
            'summary': {
                'avg_price': round(sum(prices) / len(prices), 2) if prices else 0,
                'min_price': round(min(prices), 2) if prices else 0,
                'max_price': round(max(prices), 2) if prices else 0,
                'avg_time': round(sum(times) / len(times), 1) if times else 0,
                'avg_cost_per_ton_km': round(sum(costs_per_ton_km) / len(costs_per_ton_km), 4) if costs_per_ton_km else 0,
                'best_route': routes[0] if routes else None,
                'total_options': len(routes)
            }
        }), 200
    except Exception as e:
        logger.error(f"[trip_analytics] Error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/efficiency_metrics', methods=['POST'])
def efficiency_metrics():
    """Efficiency and environmental metrics for routes"""
    try:
        req = request.json
        origin = req.get('origin_code')
        dest = req.get('dest_code')
        load = float(req.get('load_tons', 15.0))

        if not origin or not dest:
            return jsonify({'error': 'origin_code and dest_code required'}), 400

        routes = optimize_routes(
            origin, dest, load_tons=load, max_stops=1, top_n=5)

        # Calculate CO2 emissions (estimated)
        # ~0.2 kg CO2 per km per ton of cargo
        efficiency_data = []
        for idx, route in enumerate(routes):
            distance = route.get('total_dist_km', 300)
            estimated_co2 = distance * load * 0.2  # 0.2 kg CO2 per ton-km
            cost_efficiency = route.get(
                'trip_price_rs', 0) / max(distance, 1)  # Rs per km

            efficiency_data.append({
                'rank': idx + 1,
                'route_type': route.get('route_type', 'Unknown'),
                'distance_km': distance,
                'estimated_co2_kg': round(estimated_co2, 2),
                'co2_per_ton_km': round(estimated_co2 / max(distance * load, 1), 4),
                'cost_per_km': round(cost_efficiency, 2),
                'delay_risk': route.get('delay_risk_pct', 0),
                'total_cost': route.get('trip_price_rs', 0),
                'efficiency_score': route.get('efficiency_score', 0)
            })

        return jsonify({
            'metrics': efficiency_data,
            'best_cost': efficiency_data[0]['total_cost'] if efficiency_data else 0,
            'best_emissions': min([m['estimated_co2_kg'] for m in efficiency_data]) if efficiency_data else 0,
            'avg_emissions': round(sum([m['estimated_co2_kg'] for m in efficiency_data]) / len(efficiency_data), 2) if efficiency_data else 0
        }), 200
    except Exception as e:
        logger.error(f"[efficiency_metrics] Error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    initialize_graph()
    logger.info("Starting ML Inference Service...")
    app.run(host='0.0.0.0', port=5000, debug=False)


if __name__ == '__main__':
    logger.info("=" * 70)
    logger.info("Starting Cold Chain ML Service")
    logger.info("=" * 70)

    # Initialize graph (with fallback support)
    initialize_graph()

    logger.info("")
    logger.info("Service Configuration:")
    logger.info(f"  - TRIPS_CSV: {TRIPS_PATH}")
    logger.info(f"  - TOLLS_CSV: {TOLLS_PATH}")
    logger.info(f"  - DIESEL_CSV: {DIESEL_PATH}")
    logger.info(f"  - Median Diesel: ₹{MEDIAN_DIESEL:.2f}/L")
    logger.info(f"  - Median Toll: ₹{MEDIAN_TOLL_RATE:.2f}/100km")
    logger.info("")
    logger.info("Available Endpoints:")
    logger.info("  - POST   /optimize          → ML match scoring (primary)")
    logger.info("  - POST   /debug             → Feature breakdown debugging")
    logger.info("  - POST   /price             → Dynamic pricing")
    logger.info("  - POST   /optimize_route    → Route optimization")
    logger.info("  - POST   /find_backhaul     → Backhaul matching")
    logger.info("  - GET    /health            → Health check")
    logger.info("")
    logger.info("Integration with LoopLink Backend:")
    logger.info("  - Backend ML Service URL: http://localhost:8000/optimize")
    logger.info(
        "  - Expected incoming payload: {rule_score, shipment, vehicle, route}")
    logger.info(
        "  - Expected response: {ml_score, confidence, explanation, factors}")
    logger.info("")
    logger.info("=" * 70)
    logger.info(f"🚀 ML Service listening on 0.0.0.0:8000")
    logger.info("=" * 70)

    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
