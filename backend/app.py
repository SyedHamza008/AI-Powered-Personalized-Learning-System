from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, get_jwt, jwt_required, get_jwt_identity
from flask_cors import CORS
from routes.onboard import onboard_bp, init_onboard
from routes.admin import admin_bp, init_admin
from routes.assessment import ass_bp, init_assessment
from routes.teacher_analytics import teacher_analytics_bp, init_teacher_analytics
from routes.ai_insights import ai_insights_bp, init_ai_insights
from routes.student_analytics import student_analytics_bp, init_student_analytics
from routes.recommendations import recommendations_bp, init_recommendations
from routes.materials import materials_bp, init_materials
from routes.ChatBot.chatbot import chatbot_bp, init_chatbot
import datetime, bcrypt
import google.generativeai as genai
from config import Gemini_API_KEY, Gemini_Model_Name
from bson import ObjectId
from dotenv import load_dotenv

genai.configure(api_key=Gemini_API_KEY)

# Set to store revoked JWT tokens
revoked_tokens = set()

app = Flask(__name__)

# ------------------ CORS ------------------
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "http://localhost:5173",
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "expose_headers": ["Content-Type", "Authorization"]
        }
    }
)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'message': 'OK'})
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Max-Age', '86400')  # 24 hours
        return response

# ------------------ MongoDB ------------------
load_dotenv()
app.config["MONGO_URI"] = os.getenv("MONGODB_URI")
mongo = PyMongo(app)
users_collection = mongo.db["usersAuth"]

# Initialize onboard blueprint
init_onboard(mongo)
app.register_blueprint(onboard_bp)  # ensure init_onboard does NOT register blueprint again
# Initialize admin blueprint
init_admin(mongo)
app.register_blueprint(admin_bp)  # ensure init_admin does NOT register blueprint again
# Initialize assessment blueprint
init_assessment(mongo)
app.register_blueprint(ass_bp) # ensure init_assessment does NOT register blueprint again
# Initialize teacher analytics blueprint
init_teacher_analytics(mongo)
app.register_blueprint(teacher_analytics_bp)
# Initialize student analytics blueprint
init_student_analytics(mongo)
app.register_blueprint(student_analytics_bp)
# Initialize AI insights blueprint
init_ai_insights(mongo)
app.register_blueprint(ai_insights_bp)
# Initialize recommendations blueprint
init_recommendations(mongo, Gemini_Model_Name)
app.register_blueprint(recommendations_bp)
# Initialize materials blueprint
init_materials(mongo)
app.register_blueprint(materials_bp)
# Initialize chatbot blueprint
init_chatbot(mongo)
app.register_blueprint(chatbot_bp)


@app.route('/routes')
def list_routes():
    output = []
    for rule in app.url_map.iter_rules():
        methods = ', '.join(rule.methods)
        output.append(f"{rule.rule} ({methods})")
    return "<pre>" + "\n".join(output) + "</pre>"

# ------------------ JWT ------------------
app.config['JWT_SECRET_KEY'] = "your_jwt_secret_key"
jwt = JWTManager(app)

# ------------------ Routes ------------------
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        role = data.get('role', 'student')

        if not username or not password or not email:
            return jsonify({"error": "Username, password, and email are required"}), 400
        if users_collection.find_one({"username": username}):
            return jsonify({"error": "Username already exists"}), 400
        if users_collection.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        users_collection.insert_one({
            "username": username,
            "email": email,
            "password": hashed_password,
            "role": role,
            "created_at": datetime.datetime.utcnow()
        })
        return jsonify({"message": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#------login route--------
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        if not username or not password or not email:
            return jsonify({"error": "Username, password, and email are required"}), 400

        user = users_collection.find_one({"username": username})
        if not user:
            return jsonify({"error": "User not found"}), 404
        if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return jsonify({"error": "Incorrect password"}), 401
        if user['email'] != email:
            return jsonify({"error": "Email does not match"}), 401
        
        onboarded = False
        if user['role'] == 'student':
            onboarded = mongo.db.studentData.count_documents({'userId': str(user['_id'])}) > 0
        elif user['role'] == 'teacher':
            onboarded = mongo.db.TeacherData.count_documents({'userId': str(user['_id'])}) > 0
        elif user['role'] == 'admin':
            onboarded = mongo.db.AdminData.count_documents({'userId': str(user['_id'])}) > 0

        # Keep identity as string (user _id)
        access_token = create_access_token(
            identity=str(user['_id']),
            additional_claims={
                "username": user['username'],
                "role": user['role'],
                "onboarded": onboarded
            },
            expires_delta=datetime.timedelta(days=1)
        )

        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
#-----student Route-----
@app.route('/api/students/data', methods=['GET'])
@jwt_required()
def get_student_data():
    uid = get_jwt_identity()
    student_data = mongo.db.studentData.find_one({"userId": uid})
    if not student_data:
        return jsonify({"error": "Student data not found"}), 404
    return jsonify({"data": student_data}), 200
#-----student dashboard Route-----
@app.route('/api/students/dashboard', methods=['GET'])
@jwt_required()
def student_dashboard():
    uid = get_jwt_identity()  # string user ID

    # Get student profile
    student = mongo.db.studentData.find_one({"userId": uid})
    if not student:
        return jsonify({"error": "Student profile not found"}), 404

    student_id = student['_id']  # e.g., "student_001"

    # Count pending assessments
    pending_count = mongo.db.studentAssessments.count_documents({
        'studentId': student_id,
        'status': 'pending'
    })

    # Count completed assessments
    completed_count = mongo.db.studentAssessments.count_documents({
        'studentId': student_id,
        'status': 'completed'
    })

    # Get latest performance (if any)
    latest_perf = mongo.db.performance_evaluation.find_one(
        {'studentId': student_id},
        sort=[('createdAt', -1)]
    )

    return jsonify({
        "profile": {
            "name": student.get("name", "Student"),
            "gradeLevel": student.get("gradeLevel", "N/A"),
            "learningLevel": student.get("learningLevel", "N/A"),
            "studentId": student_id
        },
        "stats": {
            "pendingAssessments": pending_count,
            "completedAssessments": completed_count,
            "latestScore": latest_perf["score"] if latest_perf else None,
            "latestGrade": latest_perf["grade"] if latest_perf else None
        }
    }), 200
#-----teacher Route-----
@app.route('/api/teachers/data', methods=['GET'])
@jwt_required()
def get_teacher_data():
    current_user = get_jwt_identity()
    teacher_data = mongo.db.TeacherData.find_one({"userId": str(current_user)})
    if not teacher_data:
        return jsonify({"error": "Teacher data not found"}), 404
    return jsonify({"data": teacher_data}), 200
#-----admin Route-----
@app.route('/api/admins/data', methods=['GET'])
@jwt_required()
def get_admin_data():
    current_user = get_jwt_identity()
    admin_data = mongo.db.AdminData.find_one({"userId": str(current_user)})
    if not admin_data:
        return jsonify({"error": "Admin data not found"}), 404
    return jsonify({"data": admin_data}), 200
#------logout route--------
@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()['jti']
    revoked_tokens.add(jti)
    return jsonify({"msg": "Successfully logged out"}), 200
# Check if token is revoked
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']
    return jti in revoked_tokens

@app.route('/api/protected', methods=['GET'])
@jwt_required()
def protected():
    uid = get_jwt_identity()   # string _id
    claims = get_jwt()
    
    # Fetch user to get email
    user = users_collection.find_one({"_id": ObjectId(uid)})
    
    return jsonify({
        "uid": uid,
        "username": claims.get("username"),
        "email": user.get("email") if user else None,
        "role": claims.get("role")
    })


# ------------------ Run ------------------
if __name__ == '__main__':
    app.run(debug=True, host="localhost", port=5000)
