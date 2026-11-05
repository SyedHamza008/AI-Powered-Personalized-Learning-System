import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from bson import ObjectId
from bson.errors import InvalidId

# Configuration
ALLOWED_EXTENSIONS = {'pdf', 'mp4', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'}
MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size

materials_bp = Blueprint('materials', __name__)
mongo = None

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_materials(mongo_instance):
    """Initialize materials blueprint with mongo instance"""
    global mongo
    mongo = mongo_instance
    
    # Create upload directory
    os.makedirs('uploads', exist_ok=True)
    
    # Create indexes for performance
    mongo.db.learning_materials.create_index([("topics", 1)])
    mongo.db.learning_materials.create_index([("difficulty", 1)])
    mongo.db.learning_materials.create_index([("type", 1)])
    mongo.db.learning_materials.create_index([("status", 1)])
    
    mongo.db.learning_materials.create_index([("subject", 1)])
    mongo.db.learning_history.create_index([("student_id", 1)])
    mongo.db.learning_history.create_index([("material_id", 1)])
    mongo.db.learning_history.create_index([("timestamp", -1)])
    mongo.db.learning_history.create_index([("status", 1)])

@materials_bp.route('/api/materials/upload', methods=['POST'])
@jwt_required()
def upload_file():
    """
    Upload a file and return its URL
    Form data:
      - file: binary file data
    Returns: { success: true, fileUrl: string, filename: string }
    """
    try:
        # Authorization check
        claims = get_jwt()
        if claims.get("role") not in ['teacher', 'admin']:
            return jsonify({"error": "Unauthorized: Only teachers and admins can upload files"}), 403
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if file_length > MAX_CONTENT_LENGTH:
            return jsonify({"error": f"File too large. Max: {MAX_CONTENT_LENGTH // (1024*1024)}MB"}), 400
        
        # Generate secure unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join('uploads', unique_filename)
        
        # Save file
        file.save(filepath)
        
        # Generate URL to access the file
        file_url = f"http://localhost:5000/api/materials/files/{unique_filename}"
        
        return jsonify({
            "success": True,
            "fileUrl": file_url,
            "filename": filename,
            "size": file_length
        }), 201
        
    except Exception as e:
        return jsonify({"error": f"Upload error: {str(e)}"}), 500

# materials.py

@materials_bp.route('/api/materials/upload-multiple', methods=['POST'])
@jwt_required()
def upload_multiple_files():
    """
    Upload MULTIPLE files in one request
    """
    try:
        claims = get_jwt()
        if claims.get("role") not in ['teacher', 'admin']:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get list of files from request
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({"error": "No files provided"}), 400
        
        uploaded_files = []
        errors = []
        
        for idx, file in enumerate(files):
            if file.filename == '':
                errors.append(f"File {idx}: Empty filename")
                continue
            
            if not allowed_file(file.filename):
                errors.append(f"File {idx}: Invalid type {file.filename}")
                continue
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0)
            
            if file_length > MAX_CONTENT_LENGTH:
                errors.append(f"File {idx}: {file.filename} exceeds size limit")
                continue
            
            # Save file
            try:
                filename = secure_filename(file.filename)
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                filepath = os.path.join('uploads', unique_filename)
                file.save(filepath)
                
                file_url = f"http://localhost:5000/api/materials/files/{unique_filename}"
                
                uploaded_files.append({
                    "filename": filename,
                    "url": file_url,
                    "size": file_length,
                    "type": file.content_type or 'unknown'
                })
                
            except Exception as e:
                errors.append(f"File {idx}: Save failed - {str(e)}")
        
        
        return jsonify({
            "success": len(errors) == 0,
            "files": uploaded_files,
            "count": len(uploaded_files),
            "errors": errors if errors else []
        }), 201 if len(errors) == 0 else 207  # 207 = Multi-Status
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@materials_bp.route('/api/materials/files/<filename>', methods=['GET'])
def serve_file(filename):
    """Serve an uploaded file"""
    try:
        return send_from_directory('uploads', filename, as_attachment=False)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@materials_bp.route('/api/materials/create', methods=['POST'])
@jwt_required()
def create_material():
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        user_role = claims.get("role", "student")
        
        if user_role not in ['teacher', 'admin']:
            return jsonify({"error": "Unauthorized"}), 403
        
        data = request.get_json()
        
        # **REQUIRED: Validate content exists**
        files = data.get('files', [])
        content_url = data.get('contentUrl', '').strip()
        
        # **FIX: Ensure at least one content source**
        if not files and not content_url:
            return jsonify({
                "error": "❌ Material must have either uploaded files OR a content URL"
            }), 400
        
        # Build material document
        
        material = {
            "title": data['title'].strip(),
            "description": data['description'].strip(),
            "subject": data.get('subject', 'General').strip(),
            "topics": [t.strip().lower() for t in data['topics'] if t.strip()],
            "type": data['type'],
            "files": files if files else [],  # Ensure files is always an array
            "contentUrl": content_url if content_url else None,  # Keep URL if provided
            "difficulty": data['difficulty'],
            "estimatedTime": max(5, min(180, int(data['estimatedTime']))),
            "createdBy": current_user_id,
            "createdByRole": user_role,
            "class_id": data['class_id'],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
            "status": "active"
        }
        
        result = mongo.db.learning_materials.insert_one(material)
        
        return jsonify({
            "success": True,
            "message": "Material created",
            "materialId": str(result.inserted_id),
            "fileCount": len(files),
            "hasUrl": bool(content_url)
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        

@materials_bp.route('/api/materials/student', methods=['GET'])
@jwt_required()
def get_student_materials():
    try:
        current_user_id = get_jwt_identity()
        student = mongo.db.studentData.find_one({"userId": current_user_id})
        if not student:
            return jsonify({"error": "Student profile not found"}), 404
        
        student_custom_id = str(student['_id'])
        enrolled_classes = list(mongo.db.Classes.find({
            "memberIds": student_custom_id,
            "isActive": True
        }))
        
        class_ids = [str(cls['_id']) for cls in enrolled_classes]
        
        materials = list(mongo.db.learning_materials.find({
            "status": "active",
            "class_id": {"$in": class_ids}
        }))
        
        # **FIX: Include contentUrl in response**
        formatted_materials = []
        for material in materials:
            formatted_materials.append({
                "_id": str(material["_id"]),
                "title": material["title"],
                "description": material["description"],
                "subject": material.get("subject", "General"),
                "topics": material.get("topics", []),
                "type": material["type"],
                "files": material.get("files", []),
                "contentUrl": material.get("contentUrl", ""),  # **ADD THIS**
                "difficulty": material["difficulty"],
                "estimatedTime": material["estimatedTime"],
                "createdAt": material["createdAt"].isoformat(),
                "fileCount": len(material.get("files", []))
            })
        
        return jsonify({
            "success": True,
            "materials": formatted_materials,
            "materials_count": len(formatted_materials)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@materials_bp.route('/api/materials/start-session', methods=['POST'])
@jwt_required()
def start_learning_session():
    """Create a learning session before tracking time"""
    try:
        current_user_id = get_jwt_identity()
        student = mongo.db.studentData.find_one({"userId": current_user_id})
        if not student:
            return jsonify({"error": "Student profile not found"}), 404
        
        student_id = str(student['_id'])
        data = request.get_json()
        material_id = data.get('material_id')
        
        if not material_id:
            return jsonify({"error": "Material ID required"}), 400
        
        # Check existing active session
        existing = mongo.db.learning_history.find_one({
            "student_id": student_id,
            "material_id": material_id,
            "status": "active"
        })
        
        if existing:
            return jsonify({"success": True, "session_id": str(existing["_id"])}), 200
        
        # Create new session
        result = mongo.db.learning_history.insert_one({
            "student_id": student_id,
            "material_id": material_id,
            "start_time": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "total_time_spent_in_seconds": 0,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        return jsonify({"success": True, "session_id": str(result.inserted_id)}), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@materials_bp.route('/api/materials/track-time', methods=['POST'])
@jwt_required()
def track_learning_time():
    try:
        current_user_id = get_jwt_identity()
        student = mongo.db.studentData.find_one({"userId": current_user_id})
        if not student:
            return jsonify({"error": "Student profile not found"}), 404
        
        student_id = str(student['_id'])
        data = request.get_json()
        
        if not data or 'material_id' not in data:
            return jsonify({"error": "Material ID is required"}), 400
        
        material_id = data['material_id']
        time_spent = data.get('time_spent', 0)
        action = data.get('action', 'update')
        
        # Find active session
        session = mongo.db.learning_history.find_one({
            "student_id": student_id,
            "material_id": material_id,
            "status": "active"
        })
        
        if not session:
            return jsonify({"error": "No active learning session found"}), 404
        
        current_time = datetime.utcnow()
        update_operations = {
            "$set": {
                "last_activity": current_time,
                "updated_at": current_time
            }
        }
        
        if time_spent > 0:
            update_operations["$inc"] = {"total_time_spent_in_seconds": time_spent}
        
        # Handle different actions
        if action in ["complete", "abandon"]:
            update_operations["$set"]["status"] = action
            update_operations["$set"]["end_time"] = current_time
            
            # If completing, mark as mastered
            if action == "complete":
                material = mongo.db.learning_materials.find_one({"_id": ObjectId(material_id)})
                if material and material.get("estimatedTime"):
                    estimated_minutes = material["estimatedTime"]
                    actual_minutes = (session.get("total_time_spent_in_seconds", 0) + time_spent) / 60
                    if actual_minutes >= estimated_minutes * 0.8:
                        update_operations["$set"]["mastered"] = True
        
        # Update the session
        result = mongo.db.learning_history.update_one(
            {"_id": session["_id"]},
            update_operations
        )
        
        return jsonify({
            "success": result.modified_count > 0,
            "message": f"Learning session {action}ed",
            "time_spent": session.get("total_time_spent_in_seconds", 0) + time_spent
        }), 200
            
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@materials_bp.route('/api/materials/learning-history', methods=['GET'])
@jwt_required()
def get_learning_history():
    """
    Get student's learning history
    """
    try:
        current_user_id = get_jwt_identity()
        
        # Get student profile
        student = mongo.db.studentData.find_one({"userId": current_user_id})
        if not student:
            return jsonify({"error": "Student profile not found"}), 404
        
        student_id = str(student['_id'])
        
        # Build query
        query = {"student_id": student_id}
        
        material_id = request.args.get('material_id')
        if material_id:
            query["material_id"] = material_id
        
        status = request.args.get('status')
        if status:
            query["status"] = status
        
        # Get learning history
        limit = int(request.args.get('limit', 20))
        history_raw = list(mongo.db.learning_history.find(query)
                      .sort("created_at", -1)
                      .limit(limit))
        
        
        history = []
        for item in history_raw:
            # Get material details
            material = mongo.db.learning_materials.find_one(
                {"_id": ObjectId(item["material_id"])},
                {"title": 1, "topics": 1}
            )
        # Convert ObjectId to string
        history_item = {
                "_id": str(item["_id"]),
                "student_id": item["student_id"],
                "material_id": item["material_id"],
                "material_title": material["title"] if material else "Unknown Material",
                "material_subject": material["subject"] if material else "General",
                "material_topics": material["topics"] if material else [],
                "status": item["status"],
                "start_time": item["start_time"].isoformat() if "start_time" in item else None,
                "end_time": item["end_time"].isoformat() if "end_time" in item else None,
                "last_activity": item["last_activity"].isoformat() if "last_activity" in item else None,
                "total_time_spent_in_seconds": item.get("total_time_spent_in_seconds", 0),
                "created_at": item["created_at"].isoformat() if "created_at" in item else None,
                "updated_at": item["updated_at"].isoformat() if "updated_at" in item else None,
            }
            
        history.append(history_item)
        
        return jsonify({
            "success": True,
            "history": history,
            "total_count": len(history)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@materials_bp.route('/api/materials/access/<material_id>', methods=['GET'])
@jwt_required()
def get_material_access(material_id):
    """
    Securely access material details
    Returns material data including files array
    """
    try:
        # Verify material exists and is active
        material = mongo.db.learning_materials.find_one(
            {"_id": ObjectId(material_id), "status": "active"},
            {"title": 1, "files": 1, "type": 1, "topics": 1, "subject": 1}
        )
        
        if not material:
            return jsonify({"success": False, "error": "Material not found"}), 404
            
        # Convert ObjectId to string
        material["_id"] = str(material["_id"])
        
        return jsonify({
            "success": True,
            "material": material
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500
# Add this to materials.py

@materials_bp.route('/api/materials/teacher', methods=['GET'])
@jwt_required()
def get_teacher_materials():
    """Fetch all materials created by the logged-in teacher"""
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get("role") not in ['teacher', 'admin']:
            return jsonify({"error": "Unauthorized"}), 403
        
        # Fetch materials created by this teacher
        materials = list(mongo.db.learning_materials.find(
            {"createdBy": current_user_id, "status": "active"}
        ).sort("createdAt", -1))
        
        # Convert ObjectId fields to strings
        for material in materials:
            material["_id"] = str(material["_id"])
            material["createdBy"] = str(material["createdBy"])
            
            # Handle both old (contentUrl) and new (files) formats
            if "files" not in material:
                material["files"] = []
            if "contentUrl" in material and material["contentUrl"]:
                material["files"].append({
                    "filename": "External Link",
                    "url": material["contentUrl"],
                    "type": "url"
                })
        
        return jsonify({
            "success": True,
            "materials": materials,
            "count": len(materials)
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Add this endpoint to get classes where teacher is a member
@materials_bp.route('/api/assessments/teacher-classes', methods=['GET'])
@jwt_required()
def get_teacher_classes():
    try:
        current_user_id = get_jwt_identity()
        claims = get_jwt()
        
        if claims.get("role") != "teacher":
            return jsonify({"error": "Unauthorized"}), 403
        
        # Get teacher's custom ID
        teacher_profile = mongo.db.TeacherData.find_one({"userId": current_user_id})
        if not teacher_profile:
            return jsonify({"error": "Teacher profile not found"}), 404
        
        teacher_custom_id = str(teacher_profile['_id'])
        
        # Find classes
        classes = list(mongo.db.Classes.find({
            "memberIds": teacher_custom_id,
            "isActive": True
        }))
        
        # Convert ObjectId fields to strings
        for cls in classes:
            cls["_id"] = str(cls["_id"])
            # FIXED: Ensure ClassId is set correctly
            cls["ClassId"] = str(cls["_id"])  # Add this for compatibility
        
        return jsonify({
            "success": True,
            "classes": classes,
            "debug": {
                "teacher_custom_id": teacher_custom_id,
                "classes_found": len(classes)
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Delete material route
@materials_bp.route('/api/materials/<material_id>', methods=['DELETE'])
@jwt_required()
def delete_material(material_id):
    """Delete a material and its uploaded files"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify ownership
        material = mongo.db.learning_materials.find_one({
            "_id": ObjectId(material_id),
            "createdBy": current_user_id
        })
        
        if not material:
            return jsonify({
                "error": "Material not found or unauthorized"
            }), 404
        
        # Delete files from filesystem
        for file_info in material.get('files', []):
            if file_info.get('url', '').startswith('/api/materials/files/'):
                filename = file_info['url'].split('/')[-1]
                filepath = os.path.join('uploads', filename)
                if os.path.exists(filepath):
                    os.remove(filepath)
                    print(f"✅ Deleted file: {filepath}")
        
        # Delete from database
        result = mongo.db.learning_materials.delete_one({
            "_id": ObjectId(material_id)
        })
        
        if result.deleted_count == 1:
            return jsonify({
                "success": True,
                "message": "Material and files deleted successfully"
            }), 200
        else:
            return jsonify({
                "error": "Material not deleted"
            }), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#Data migration route
@materials_bp.route('/api/materials/migrate', methods=['POST'])
@jwt_required()
def migrate_materials():
    """
    One-time migration script to add class_id to existing materials
    Only affects learning_materials collection (adds class_id field)
    """
    try:
        # Verify admin role
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Unauthorized: Admin access required"}), 403
        
        # Count materials before migration
        total_materials = mongo.db.learning_materials.count_documents({})
        materials_to_update = mongo.db.learning_materials.count_documents({"class_id": {"$exists": False}})
        
        print(f"Total materials: {total_materials}")
        print(f"Materials needing update: {materials_to_update}")
        
        if materials_to_update == 0:
            return jsonify({
                "success": True,
                "message": "No materials need migration"
            }), 200
        
        # Get materials without class_id
        materials = list(mongo.db.learning_materials.find({"class_id": {"$exists": False}}))
        
        updated_count = 0
        failed_count = 0
        
        for material in materials:
            try:
                # Get the first class created by this teacher - use string ID
                teacher_class = mongo.db.classes.find_one({"createdBy": material["createdBy"]})
                
                if teacher_class:
                    # Update material with class_id as string
                    result = mongo.db.learning_materials.update_one(
                        {"_id": material["_id"]},
                        {"$set": {"class_id": str(teacher_class["_id"])}}
                    )
                    
                    if result.modified_count > 0:
                        updated_count += 1
                        print(f"✓ Updated material {material['_id']} with class {teacher_class['_id']}")
                    else:
                        print(f"⚠ No changes made to material {material['_id']}")
                else:
                    failed_count += 1
                    print(f"✗ No class found for teacher {material['createdBy']}")
            except Exception as e:
                failed_count += 1
                print(f"✗ Error updating material {material['_id']}: {str(e)}")
        
        return jsonify({
            "success": True,
            "message": f"Migration completed. Updated: {updated_count}, Failed: {failed_count}",
            "total_materials": total_materials,
            "materials_processed": len(materials)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@materials_bp.route('/api/materials/verify-teacher-ids', methods=['GET'])
@jwt_required()
def verify_teacher_ids():
    try:
        current_user_id = get_jwt_identity()
        
        # Get teacher data
        teacher_data = mongo.db.TeacherData.find_one({"userId": current_user_id})
        
        # Get all classes
        all_classes = list(mongo.db.Classes.find({}))
        
        # Find classes containing this teacher (by any ID)
        matching_classes = []
        for cls in all_classes:
            member_ids = cls.get("memberIds", [])
            if current_user_id in member_ids:
                matching_classes.append({
                    "class_id": str(cls["_id"]),
                    "class_title": cls.get("title"),
                    "member_ids": member_ids
                })
        
        return jsonify({
            "current_user_id": current_user_id,
            "teacher_data": teacher_data,
            "teacher_userId": teacher_data.get("userId") if teacher_data else None,
            "matching_classes": matching_classes,
            "all_classes_count": len(all_classes)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500