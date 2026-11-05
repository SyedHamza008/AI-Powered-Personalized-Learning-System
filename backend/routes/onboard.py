import datetime
from flask_pymongo import PyMongo
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
import pymongo

onboard_bp = Blueprint('onboard', __name__, url_prefix='/api/onboard')
mongo = None

def init_onboard(db):
    global mongo
    mongo = db

# ---------- helpers ----------
def next_custom_id(prefix:str)->str:
    """Atomically generate student_001, teacher_001 ..."""
    col = mongo.db.counters
    doc = col.find_one_and_update(
        {'_id': prefix},
        {'$inc': {'seq': 1}},
        upsert=True,
        return_document=pymongo.ReturnDocument.AFTER
    )
    return f"{prefix}_{doc['seq']:03d}"

# ---------- STUDENT ----------
@onboard_bp.post('/student')
@jwt_required()
def student_onboard():
    uid = get_jwt_identity()          # user id (string)
    claims = get_jwt()
    if claims.get('role') != 'student':
        return jsonify({'error': 'Only students can access this endpoint'}), 403
    
    data = request.get_json()
    # Example data: {'name': 'Alice', 'learningLevel': 'beginner'}
    sid = next_custom_id('student')
    mongo.db.studentData.insert_one({
        '_id': sid,
        'userId': str(uid),
        'name': data['name'],
        'learningLevel': data['learningLevel'],
        'createdAt': datetime.datetime.utcnow()
    })
    return jsonify({'success': True, 'studentId': sid}), 201

# ---------- TEACHER ----------
@onboard_bp.post('/teacher')
@jwt_required()
def teacher_onboard():
    uid = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'teacher':
        return jsonify({'error': 'Only teachers can access this endpoint'}), 403
    
    data = request.get_json()
    tid = next_custom_id('teacher')
    mongo.db.TeacherData.insert_one({
        '_id': tid,
        'userId': uid,
        'name': data['name'],
        'department': data['department'],
        'education': data['education'],
        'createdAt': datetime.datetime.utcnow()
    })
    return jsonify({'success': True, 'teacherId': tid}), 201

# ---------- ADMIN ----------
@onboard_bp.post('/admin')
@jwt_required()
def admin_onboard():
    uid = get_jwt_identity()
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Only admins can access this endpoint'}), 403
    
    data = request.get_json()
    if 'name' not in data:
        return jsonify({'error': 'Name is required'}), 400

    existing = mongo.db.AdminData.find_one({'userId': uid})
    if existing:
        return jsonify({'error': 'Admin profile already exists'}), 400
    aid = next_custom_id('admin')
    mongo.db.AdminData.insert_one({
        '_id': aid,
        'userId': uid,
        'name': data['name'],
        'createdAt': datetime.datetime.utcnow()
    })
    return jsonify({'success': True, 'adminId': aid}), 201

# Test route to verify blueprint is working
@onboard_bp.route('/test')
def test_route():
    return jsonify({"message": "Blueprint is working!"})

# ---------- check if already onboarded ----------
@onboard_bp.route('/status', methods=['GET', 'OPTIONS'])
@jwt_required()
def onboard_status():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    uid = get_jwt_identity()          # string user ID
    claims = get_jwt()
    role = claims.get("role")

    if role == 'student':
        exists = mongo.db.studentData.count_documents({'userId': uid}) > 0
    elif role == 'teacher':
        exists = mongo.db.TeacherData.count_documents({'userId': uid}) > 0
    elif role == 'admin':
        exists = mongo.db.AdminData.count_documents({'userId': uid}) > 0
    else:
        return jsonify({'error': 'Unknown role'}), 400

    return jsonify({
        'onboarded': exists,
        'role': role
    }), 200

# Onboarding complete
@onboard_bp.route('/complete', methods=['POST'])
@jwt_required()
def onboard_complete():
    """Endpoint called after onboarding is completed"""
    try:
        uid = get_jwt_identity()
        claims = get_jwt()
        role = claims.get("role")
        
        # Generate a NEW token specifically for dashboard access
        dashboard_token = create_access_token(
            identity=str(uid),
            additional_claims={
                "username": claims.get('username'),
                "role": role,
                "onboarded": True  # 🔥 New claim to indicate onboarding completed
            },
            expires_delta=datetime.timedelta(hours=2)  # Short-lived token for dashboard access
        )
        
        return jsonify({
            "message": "Onboarding completed successfully",
            "dashboard_token": dashboard_token,
            "onboarded": True
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
