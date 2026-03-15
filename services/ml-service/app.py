"""
Cold Chain ML Inference Service
Exported from memory_optimized_route.ipynb
Serves ML predictions for shipment-vehicle matching
"""

from flask import Flask, request, jsonify
import numpy as np
import logging
from typing import Dict, Any

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Feature Computation (from notebook)
# ============================================================================

def compute_spoilage_risk(shipment: Dict[str, Any]) -> float:
    """Compute spoilage risk from shipment features"""
    risk = 0.0
    
    # Temperature requirement adds risk
    if shipment.get('required_temp') != -1:
        risk += 0.45
    
    # Load type indicates perishability
    load_type = str(shipment.get('load_type', '')).lower()
    if any(x in load_type for x in ['perish', 'dairy', 'fruit', 'vegetable']):
        risk += 0.25
    
    # Time pressure
    days = shipment.get('days_available', 1)
    if days <= 1:
        risk += 0.30
    elif days <= 3:
        risk += 0.15
    
    return min(1.0, risk)


def compute_capacity_score(shipment: Dict[str, Any], vehicle: Dict[str, Any]) -> float:
    """Compute how well vehicle capacity matches shipment load"""
    load_weight = shipment.get('load_weight', 0)
    load_volume = shipment.get('load_volume', 0)
    capacity = vehicle.get('capacity', 1)
    max_weight = vehicle.get('max_weight', 1)
    
    # Normalize both dimensions to 0-1
    vol_util = min(1.0, load_volume / max(capacity, 1))
    weight_util = min(1.0, load_weight / max(max_weight, 1))
    
    # Good utilization is 20-80% (not too empty, not overloaded)
    # Under 20% = inefficient
    # Over 80% = risky
    avg_util = (vol_util + weight_util) / 2.0
    
    if avg_util < 0.20:
        return 0.5 - (0.20 - avg_util) * 2  # Penalty for underutilization
    elif avg_util > 0.80:
        return 1.0 - (avg_util - 0.80) * 2  # Penalty for overutilization
    else:
        return 0.7 + ((avg_util - 0.20) / 0.60) * 0.3  # Score range 0.7-1.0 for good utilization


def compute_temp_match_score(shipment: Dict[str, Any], vehicle: Dict[str, Any]) -> float:
    """Check if vehicle temperature capability matches shipment requirement"""
    required_temp = shipment.get('required_temp', -1)
    
    # No temperature requirement = perfect match
    if required_temp == -1:
        return 1.0
    
    is_refrigerated = vehicle.get('is_refrigerated', False)
    if not is_refrigerated:
        return 0.0  # Non-refrigerated vehicle can't handle cold shipment
    
    vehicle_temp = vehicle.get('temperature', 0)
    temp_diff = abs(vehicle_temp - required_temp)
    
    # Perfect match = 1.0, each degree off = -0.05
    score = max(0.0, 1.0 - (temp_diff * 0.05))
    return score


def compute_distance_penalty(route: Dict[str, Any]) -> float:
    """Penalize long distances (prefer shorter routes)"""
    distance_km = route.get('distance_km', 0) if route else 300
    
    # Base penalty at 300km, increases with distance
    # 0km = 1.0, 300km = 0.7, 600km = 0.4
    return max(0.0, 1.0 - (distance_km / 1000.0))


def compute_time_penalty(route: Dict[str, Any], shipment: Dict[str, Any]) -> float:
    """Penalize if route time exceeds available time window"""
    if not route:
        return 0.8  # Neutral penalty if no route data
    
    estimated_time = route.get('estimated_time', 24)  # Minutes
    available_hours = shipment.get('days_available', 1) * 24
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


def compute_carbon_efficiency(route: Dict[str, Any], vehicle: Dict[str, Any]) -> float:
    """Score based on carbon footprint efficiency"""
    if not route or not vehicle:
        return 0.7
    
    carbon_kg = route.get('carbon_kg', 50)
    distance_km = route.get('distance_km', 300)
    
    # Carbon per km
    carbon_per_km = carbon_kg / max(distance_km, 1)
    vehicle_carbon = vehicle.get('carbon_footprint', 2.5)
    
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
    route: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compute ML match score using weighted combination of factors
    Returns score (0-100) with component breakdown
    """
    
    # Compute individual factors (all 0-1 range)
    spoilage_risk = compute_spoilage_risk(shipment)
    capacity_score = compute_capacity_score(shipment, vehicle)
    temp_match = compute_temp_match_score(shipment, vehicle)
    distance_penalty = compute_distance_penalty(route)
    time_penalty = compute_time_penalty(route, shipment)
    carbon_score = compute_carbon_efficiency(route, vehicle)
    
    # Weighted combination
    # Weights emphasize cold chain (spoilage, temp) and practical constraints (time, capacity)
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
    if shipment.get('required_temp') == -1:
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
    
    if distance_penalty > 0.8:
        explanations.append("efficient short-distance route")
    elif distance_penalty < 0.5:
        explanations.append("long distance may increase costs")
    
    if time_penalty == 1.0:
        explanations.append("plenty of time to deliver")
    elif time_penalty < 0.5:
        explanations.append("tight delivery timeline")
    
    explanation = "Match quality driven by: " + "; ".join(explanations) if explanations else "Model-based match assessment"
    
    return {
        'ml_score': ml_score_100,
        'confidence': confidence,
        'explanation': explanation,
        'factors': {
            'spoilage_mitigation': (1.0 - spoilage_risk) * 100,
            'capacity_efficiency': capacity_score * 100,
            'temperature_alignment': temp_match * 100,
            'route_distance': distance_penalty * 100,
            'time_fit': time_penalty * 100,
            'carbon_efficiency': carbon_score * 100
        }
    }


# ============================================================================
# Flask Endpoints
# ============================================================================

@app.route('/optimize', methods=['POST'])
def optimize():
    """
    Main inference endpoint
    Accepts feature-rich payload and returns ML predictions
    """
    try:
        data = request.json
        
        # Extract top-level fields
        rule_score = data.get('rule_score', 70.0)
        shipment = data.get('shipment', {})
        vehicle = data.get('vehicle', {})
        route = data.get('route', {})
        
        # Compute ML score
        result = compute_match_score(rule_score, shipment, vehicle, route)
        
        logger.info(f"Prediction for shipment {shipment.get('id')}: score={result['ml_score']:.1f}, confidence={result['confidence']:.2f}")
        
        return jsonify(result), 200
    
    except Exception as e:
        logger.error(f"Inference error: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'ml_score': 50.0,
            'confidence': 0.5,
            'explanation': 'Error during inference; using neutral score'
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'cold-chain-ml'}), 200


@app.route('/debug', methods=['POST'])
def debug():
    """Debug endpoint to see feature breakdown"""
    try:
        data = request.json
        shipment = data.get('shipment', {})
        vehicle = data.get('vehicle', {})
        route = data.get('route', {})
        
        return jsonify({
            'spoilage_risk': compute_spoilage_risk(shipment),
            'capacity_score': compute_capacity_score(shipment, vehicle),
            'temp_match': compute_temp_match_score(shipment, vehicle),
            'distance_penalty': compute_distance_penalty(route),
            'time_penalty': compute_time_penalty(route, shipment),
            'carbon_score': compute_carbon_efficiency(route, vehicle)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    logger.info("Starting Cold Chain ML Service on port 8000")
    app.run(host='0.0.0.0', port=8000, debug=False, threaded=True)
