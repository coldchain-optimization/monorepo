import json
import re
import math
import warnings
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from flask import Flask, request, jsonify
import logging

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ── File paths ────────────────────────────────────────────────────────────────
TRIPS_PATH = 'Delivery_truck_trip_data.csv'
TOLLS_PATH = 'tolls-with-metadata.csv'
DIESEL_PATH = 'all_india_live_diesel.csv'

# ── Pricing model parameters ──────────────────────────────────
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

# ── Setup & Graph Loading ───────────────────────────────────────────────────────


def initialize_graph():
    global lane_graph, MEDIAN_DIESEL, MEDIAN_TOLL_RATE
    try:
        logger.info("Loading mapping data...")
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
        logger.warning(
            f"Could not initialize lane graph (expected if CSVs absent): {e}")


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

# ── Endpoints ──────────────────────────────────────────────────────────────────


@app.route('/optimize_route', methods=['POST'])
def api_optimize_route():
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


if __name__ == '__main__':
    initialize_graph()
    app.run(host='0.0.0.0', port=8001)
