import datetime
import os
import pymongo
import subprocess,platform
from flask import Blueprint, request, jsonify, send_file, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required
from bson import ObjectId
from werkzeug.security import generate_password_hash
import uuid

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
mongo = None

def init_admin(db):
    global mongo
    mongo = db
# Configuration for backup directory
DB_NAME = 'AI-PoweredPersonalizedLearningSystem'
BACKUP_DIR = 'backups'  # Directory to store backup files
TEMP_UPLOAD_DIR = 'temp_uploads'  # Directory for temporary uploads

# Ensure backup and temp directories exist
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

# ---------- HELPER FUNCTIONS ----------
def next_custom_id(prefix: str) -> str:
    """Generate sequential custom IDs like student_001, teacher_001, group_001"""
    doc = mongo.db.counters.find_one_and_update(
        {'_id': prefix}, 
        {'$inc': {'seq': 1}},
        upsert=True, 
        return_document=pymongo.ReturnDocument.AFTER
    )
    return f"{prefix}_{doc['seq']:03d}"

def is_admin_user():
    """Check if current user has admin role"""
    try:
        current_user_id = get_jwt_identity()
        user = mongo.db.usersAuth.find_one({'_id': ObjectId(current_user_id)})
        return user and user.get('role') == 'admin'
    except:
        return False

# ---------- DASHBOARD STATISTICS ----------
@admin_bp.get('/dashboard-stats')
@jwt_required()
def dashboard_stats():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        total_students = mongo.db.studentData.count_documents({})
        total_teachers = mongo.db.TeacherData.count_documents({})
        total_classes = mongo.db.Classes.count_documents({})
        total_users = mongo.db.usersAuth.count_documents({})
        
        return jsonify({
            'totalStudents': total_students,
            'totalTeachers': total_teachers,
            'totalClasses': total_classes,
            'totalUsers': total_users,
            'lastUpdated': datetime.datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- GLOBAL STUDENT LIST ----------
@admin_bp.get('/students')
@jwt_required()
def all_students():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        pipeline = [
            {
                '$addFields': {'userIdObj': {'$toObjectId': '$userId'}}
            },
            {'$lookup': {
                'from': 'usersAuth',
                'localField': 'userIdObj',
                'foreignField': '_id',
                'as': 'user'
            }},
            {'$unwind': '$user'},
            {'$project': {
                'studentId': '$_id',
                'userId': {'$toString': '$user._id'},
                'name': '$name',  # Changed from fullName to name
                'email': '$user.email',
                'learningLevel': '$learningLevel',
                'userRole': '$user.role',
                'isActive': '$user.isActive',
                'createdAt': '$user.created_at',
                '_id': 0
            }},
            {'$sort': {'name': 1}}
        ]
        students = list(mongo.db.studentData.aggregate(pipeline))
        print("Students found:", len(students))
        if students:
            print("First student:", students[0])
        return jsonify({'success': True, 'students': students})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- GLOBAL TEACHER LIST ----------
@admin_bp.get('/teachers')
@jwt_required()
def all_teachers():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        pipeline = [
            {'$addFields': {'userIdObj': {'$toObjectId': '$userId'}}},
            {'$lookup': {
                'from': 'usersAuth',
                'localField': 'userIdObj',
                'foreignField': '_id',
                'as': 'user'
            }},
            {'$unwind': '$user'},
            {'$project': {
                'teacherId': '$_id',
                'userId': {'$toString': '$user._id'},
                'name': '$name',  # Changed from fullName to name
                'email': '$user.email',
                'department': '$department',
                'education': '$education',
                'userRole': '$user.role',
                'isActive': '$user.isActive',
                'createdAt': '$user.created_at',
                '_id': 0
            }},
            {'$sort': {'name': 1}}
        ]
        teachers = list(mongo.db.TeacherData.aggregate(pipeline))  # Fixed collection name
        return jsonify({'success': True, 'teachers': teachers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- CREATE NEW USER (Student/Teacher) ----------
@admin_bp.post('/users/create')
@jwt_required()
def create_user():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        required_fields = ['username', 'email', 'password', 'role']
        
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        if data['role'] not in ['student', 'teacher']:
            return jsonify({'error': 'Role must be student or teacher'}), 400
        
        # Check if username or email already exists
        if mongo.db.usersAuth.find_one({'username': data['username']}):
            return jsonify({'error': 'Username already exists'}), 400
        
        if mongo.db.usersAuth.find_one({'email': data['email']}):
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create user record using your existing schema
        import bcrypt
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            'username': data['username'],
            'email': data['email'],
            'password': hashed_password,
            'role': data['role'],
            'created_at': datetime.datetime.utcnow()
        }
        
        result = mongo.db.usersAuth.insert_one(user_data)
        user_id = result.inserted_id
        
        # Create role-specific record
        if data['role'] == 'student':
            student_id = next_custom_id('student')
            student_data = {
                '_id': student_id,
                'userId': user_id,
                'name': data.get('name', data['username']),
                'learningLevel': data.get('learningLevel', 'beginner'),
                'gradeLevel': data.get('gradeLevel', 'Not Specified'),
                'createdAt': datetime.datetime.utcnow()
            }
            mongo.db.studentData.insert_one(student_data)
            return jsonify({'success': True, 'userId': str(user_id), 'studentId': student_id})
        
        else:  # teacher
            teacher_id = next_custom_id('teacher')
            teacher_data = {
                '_id': teacher_id,
                'userId': user_id,
                'name': data.get('name', data['username']),
                'department': data.get('department', 'General'),
                'education': data.get('education', 'Not Specified'),
                'createdAt': datetime.datetime.utcnow()
            }
            mongo.db.TeacherData.insert_one(teacher_data)  # Fixed collection name
            return jsonify({'success': True, 'userId': str(user_id), 'teacherId': teacher_id})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- PROMOTE STUDENT → TEACHER ----------
@admin_bp.post('/promote-student')
@jwt_required()
def promote_student():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        student_id = data.get('studentId')
        
        if not student_id:
            return jsonify({'error': 'Student ID is required'}), 400
        
        # Find student record
        student = mongo.db.studentData.find_one({'_id': student_id})
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Get user record
        user = mongo.db.usersAuth.find_one({'_id': student['userId']})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user['role'] != 'student':
            return jsonify({'error': 'User is not a student'}), 400
        
        # Create teacher record
        teacher_id = next_custom_id('teacher')
        teacher_data = {
            '_id': teacher_id,
            'userId': user['_id'],
            'name': user['username'],
            'department': data.get('department', 'General'),
            'education': data.get('education', 'B.Ed'),
            'createdAt': datetime.datetime.utcnow(),
            'promotedFromStudent': student_id
        }
        mongo.db.TeacherData.insert_one(teacher_data)  # Fixed collection name
        
        # Update user role
        mongo.db.usersAuth.update_one(
            {'_id': user['_id']}, 
            {'$set': {'role': 'teacher'}}
        )
        
        # Log promotion
        mongo.db.role_changes.insert_one({
            'userId': user['_id'],
            'oldRole': 'student',
            'newRole': 'teacher',
            'changedBy': get_jwt_identity(),
            'changedAt': datetime.datetime.utcnow(),
            'notes': data.get('notes', '')
        })
        
        # Archive student record
        mongo.db.studentData.update_one(
            {'_id': student_id},
            {'$set': {'isArchived': True, 'archivedAt': datetime.datetime.utcnow()}}
        )
        
        return jsonify({
            'success': True, 
            'teacherId': teacher_id,
            'message': f'Student {user["username"]} promoted to teacher successfully'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- CREATE GROUP/CLASS ----------
@admin_bp.post('/groups/create')
@jwt_required()
def create_group():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        required_fields = ['title', 'subject']
        
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Title and subject are required'}), 400
        
        group_id = next_custom_id('group')
        group_data = {
            '_id': group_id,
            'title': data['title'],
            'subject': data['subject'],
            'description': data.get('description', ''),
            'memberIds': [],
            'permissions': { 
                'hideStudentNames': False 
            },
            'createdBy': get_jwt_identity(),
            'createdAt': datetime.datetime.utcnow(),
            'isActive': True
        }
        mongo.db.Classes.insert_one(group_data)
        
        return jsonify({'success': True, 'groupId': group_id, 'message': 'Group created successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- GET GROUP DETAILS ----------
@admin_bp.get('/groups/<group_id>')
@jwt_required()
def get_group(group_id):
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        group = mongo.db.Classes.find_one({'_id': group_id})
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        print(f"Debug: Found group {group_id} with memberIds: {group.get('memberIds', [])}")
        
        # Get member details
        members = []
        member_ids = group.get('memberIds', [])
        
        # Process each member individually (more reliable than aggregation)
        for member_id in member_ids:
            if member_id.startswith('student_'):
                # Fetch student
                student = mongo.db.studentData.find_one({'_id': member_id})
                if student:
                    print(f"Debug: Found student {member_id}: {student}")
                    # Handle userId (could be ObjectId or string)
                    user_id = student['userId']
                    if isinstance(user_id, str):
                        try:
                            user_id = ObjectId(user_id)
                        except:
                            print(f"Debug: Invalid ObjectId string for student {member_id}")
                            continue
                    
                    user = mongo.db.usersAuth.find_one({'_id': user_id})
                    if user:
                        print(f"Debug: Found user for student {member_id}: {user['email']}")
                        members.append({
                            'id': member_id,
                            'name': student.get('name', 'Unknown'),
                            'email': user.get('email', 'No email'),
                            'role': 'student',
                            'gradeLevel': student.get('gradeLevel', 'Not Specified'),
                            'userId': str(user['_id'])
                        })
                    
            elif member_id.startswith('teacher_'):
                # Fetch teacher
                teacher = mongo.db.TeacherData.find_one({'_id': member_id})
                if teacher:
                    print(f"Debug: Found teacher {member_id}: {teacher}")
                    # Handle userId (could be ObjectId or string)
                    user_id = teacher['userId']
                    if isinstance(user_id, str):
                        try:
                            user_id = ObjectId(user_id)
                        except:
                            print(f"Debug: Invalid ObjectId string for teacher {member_id}")
                            continue
                    
                    user = mongo.db.usersAuth.find_one({'_id': user_id})
                    if user:
                        print(f"Debug: Found user for teacher {member_id}: {user['email']}")
                        members.append({
                            'id': member_id,
                            'name': teacher.get('name', 'Unknown'),
                            'email': user.get('email', 'No email'),
                            'role': 'teacher',
                            'department': teacher.get('department', 'General'),
                            'userId': str(user['_id'])
                        })
        
        print(f"Debug: Total members found: {len(members)}")
        
        # Return data with consistent ID naming
        return jsonify({
            'success': True,
            'group': {
                'ClassId': group_id,  # Use ClassId consistently
                'groupId': group_id,  # Also include groupId for compatibility
                'title': group['title'],
                'subject': group['subject'],
                'description': group.get('description', ''),
                'members': members,
                'createdAt': group['createdAt'],
                'memberCount': len(members),
                'permissions': group.get('permissions', {'hideStudentNames': False})
            }
        })
        
    except Exception as e:
        print(f"Error in get_group: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ---------- ADD MEMBER TO GROUP ----------
@admin_bp.post('/groups/<group_id>/members')
@jwt_required()
def add_member(group_id):
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        member_id = data.get('memberId')
        
        if not member_id:
            return jsonify({'error': 'Member ID is required'}), 400
        
        # Check if group exists
        group = mongo.db.Classes.find_one({'_id': group_id})
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        # Check if member exists and get type
        member_type = None
        if member_id.startswith('student_'):
            member = mongo.db.studentData.find_one({'_id': member_id})
            member_type = 'student'
        elif member_id.startswith('teacher_'):
            member = mongo.db.TeacherData.find_one({'_id': member_id})  # Fixed collection name
            member_type = 'teacher'
        else:
            return jsonify({'error': 'Invalid member ID format'}), 400
        
        if not member:
            return jsonify({'error': 'Member not found'}), 404
        
        # Check if member already in group
        if member_id in group.get('memberIds', []):
            return jsonify({'error': 'Member already in group'}), 400
        
        # Add member to group
        mongo.db.Classes.update_one(
            {'_id': group_id},
            {'$push': {'memberIds': member_id}, '$set': {'updatedAt': datetime.datetime.utcnow()}}
        )
        
        return jsonify({'success': True, 'message': f'{member_type.capitalize()} added to group successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- REMOVE MEMBER FROM GROUP ----------
@admin_bp.delete('/groups/<group_id>/members/<member_id>')
@jwt_required()
def remove_member(group_id, member_id):
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        # Check if group exists
        group = mongo.db.Classes.find_one({'_id': group_id})
        if not group:
            return jsonify({'error': 'Group not found'}), 404
        
        # Remove member from group
        result = mongo.db.Classes.update_one(
            {'_id': group_id},
            {'$pull': {'memberIds': member_id}, '$set': {'updatedAt': datetime.datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Member not found in group'}), 404
        
        return jsonify({'success': True, 'message': 'Member removed from group successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# ---------- UPDATE GROUP PERMISSIONS ----------
@admin_bp.patch('/groups/<group_id>/permissions')
@jwt_required()
def update_group_permissions(group_id):
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        data = request.get_json()
        permissions = data.get('permissions', {})
        
        # Validate group exists
        group = mongo.db.Classes.find_one({'_id': group_id})
        if not group:
            return jsonify({'error': 'Group not found'}), 404

        # Update the specific permission fields
        # We use dot notation 'permissions.hideStudentNames' to preserve other future permissions
        mongo.db.Classes.update_one(
            {'_id': group_id},
            {
                '$set': {
                    'permissions.hideStudentNames': bool(permissions.get('hideStudentNames', False)),
                    'updatedAt': datetime.datetime.utcnow()
                }
            }
        )
        
        return jsonify({'success': True, 'message': 'Permissions updated successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# ---------- LIST ALL GROUPS ----------
@admin_bp.get('/groups')
@jwt_required()
def list_groups():
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        groups = list(mongo.db.Classes.find(
            {'isActive': True},
            projection={'title': 1, 'subject': 1, 'memberIds': 1, 'createdAt': 1}
        ).sort('createdAt', -1))
        
        for group in groups:
            group['ClassId'] = group.pop('_id')
            group['memberCount'] = len(group.get('memberIds', []))
            group.pop('memberIds', None)
        
        return jsonify({'success': True, 'groups': groups})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- DELETE GROUP ----------
@admin_bp.delete('/groups/<group_id>')
@jwt_required()
def delete_group(group_id):
    if not is_admin_user():
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        result = mongo.db.Classes.update_one(
            {'_id': group_id},
            {'$set': {'isActive': False, 'deletedAt': datetime.datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Group not found'}), 404
        
        return jsonify({'success': True, 'message': 'Group deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 1. BACKUP ENDPOINT (React calls this to download)

@admin_bp.route('/api/admin/backup', methods=['GET'])
def backup_database():
    timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    filename = f"backup_{DB_NAME}_{timestamp}.gzip"
    filepath = os.path.join(BACKUP_DIR, filename)

    # Command for MongoDB Backup (Windows)
    # --archive writes to a single file, --gzip compresses it
    command = f'mongodump --db {DB_NAME} --archive="{filepath}" --gzip'

    try:
        # Run command. shell=True is required on Windows to find the executable in PATH
        subprocess.check_call(command, shell=True)
        
        # Send file to React frontend
        return send_file(filepath, as_attachment=True, download_name=filename)
    
    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Backup failed", "details": str(e)}), 500
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred", "details": str(e)}), 500

# -------------------------------------------------------
# 2. RESTORE ENDPOINT (React sends file here)
# -------------------------------------------------------
@admin_bp.route('/api/admin/restore', methods=['POST'])
def restore_database():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file:
        # 1. Save the uploaded file temporarily
        temp_path = os.path.join(TEMP_UPLOAD_DIR, "temp_restore.gzip")
        file.save(temp_path)

        # 2. Run Restore Command
        # --drop removes existing data in that DB before restoring (clean slate)
        command = f'mongorestore --gzip --archive="{temp_path}" --drop'

        try:
            subprocess.check_call(command, shell=True)
            
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            return jsonify({"message": "Database restored successfully!"}), 200
            
        except subprocess.CalledProcessError as e:
            return jsonify({"error": "Restore failed (Check if Database Tools are installed)", "details": str(e)}), 500