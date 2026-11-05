import datetime
import pymongo
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from bson import ObjectId

ass_bp = Blueprint('assessment', __name__, url_prefix='/api/assessments')
mongo = None

def init_assessment(db):
    global mongo
    mongo = db

# ---------- TEACHER: LIST MY CLASSES ----------
@ass_bp.get('/my-classes')
@jwt_required()
def teacher_my_classes():
    uid = get_jwt_identity()
    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher profile not found'}), 404

    teacher_id = teacher_doc['_id']
    classes = list(mongo.db.Classes.find(
        {'memberIds': teacher_id, 'isActive': True},
        {'title': 1, 'subject': 1, 'description': 1, 'memberIds': 1, 'createdAt': 1}
    ))
    
    for cls in classes:
        cls['ClassId'] = str(cls['_id'])
        cls['memberCount'] = len(cls.get('memberIds', []))
        del cls['_id']

    return jsonify({'classes': classes}), 200

# ---------- TEACHER: GET CLASS DETAILS ----------
@ass_bp.get('/class/<class_id>')
@jwt_required()
def teacher_get_class(class_id):
    uid = get_jwt_identity()
    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher not found'}), 404

    teacher_id = teacher_doc['_id']
    group = mongo.db.Classes.find_one({
        '_id': class_id,
        'memberIds': teacher_id,
        'isActive': True
    })
    if not group:
        return jsonify({'error': 'Class not found or access denied'}), 404

    # 1. CHECK PERMISSIONS SET BY ADMIN
    # We default to False if 'permissions' doesn't exist
    hide_student_names = group.get('permissions', {}).get('hideStudentNames', False)

    members = []
    for member_id in group.get('memberIds', []):
        if member_id.startswith('student_'):
            student = mongo.db.studentData.find_one({'_id': member_id})
            if student:
                user_id = student['userId']
                if isinstance(user_id, str):
                    user = mongo.db.usersAuth.find_one({'_id': ObjectId(user_id)})
                else:
                    user = mongo.db.usersAuth.find_one({'_id': user_id})
                
                if user:
                    # 2. APPLY PRIVACY LOGIC
                    if hide_student_names:
                        # Anonymize the data
                        # Extract the ID number (e.g. student_001 -> "Student-001")
                        display_name = f"Student-{member_id.split('_')[1] if '_' in member_id else '000'}"
                        display_email = "Hidden due to class privacy settings"
                    else:
                        # Show actual data
                        display_name = student.get('name', 'Unknown')
                        display_email = user.get('email', 'No email')

                    members.append({
                        'id': member_id,
                        'name': display_name, 
                        'email': display_email,
                        'role': 'student',
                        'gradeLevel': student.get('gradeLevel', 'Not Specified'),
                        'userId': str(user['_id'])
                    })

        elif member_id.startswith('teacher_'):
            teacher = mongo.db.TeacherData.find_one({'_id': member_id})
            if teacher:
                user_id = teacher['userId']
                if isinstance(user_id, str):
                    user = mongo.db.usersAuth.find_one({'_id': ObjectId(user_id)})
                else:
                    user = mongo.db.usersAuth.find_one({'_id': user_id})
                if user:
                    # Teachers are always visible to other teachers
                    members.append({
                        'id': member_id,
                        'name': teacher.get('name', 'Unknown'),
                        'email': user.get('email', 'No email'),
                        'role': 'teacher',
                        'department': teacher.get('department', 'General'),
                        'userId': str(user['_id'])
                    })

    return jsonify({
        'success': True,
        'group': {
            'groupId': class_id,
            'title': group['title'],
            'subject': group['subject'],
            'topic': group.get('topic', ''),
            'description': group.get('description', ''),
            'members': members,
            'createdAt': group['createdAt'],
            'memberCount': len(members),
            'permissions': group.get('permissions', {}) # Optional: Pass back so UI knows why names are hidden
        }
    })

# ---------- TEACHER: ADD MEMBER TO CLASS ----------
@ass_bp.post('/class/<class_id>/add-member')
@jwt_required()
def teacher_add_member(class_id):
    uid = get_jwt_identity()
    data = request.get_json()
    member_id = data.get('memberId')
    
    if not member_id:
        return jsonify({'error': 'Member ID required'}), 400

    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher not found'}), 404

    class_doc = mongo.db.Classes.find_one({
        '_id': class_id,
        'memberIds': teacher_doc['_id'],
        'isActive': True
    })
    if not class_doc:
        return jsonify({'error': 'Class not found or access denied'}), 404

    if member_id.startswith('student_'):
        member = mongo.db.studentData.find_one({'_id': member_id})
    elif member_id.startswith('teacher_'):
        member = mongo.db.TeacherData.find_one({'_id': member_id})
    else:
        return jsonify({'error': 'Invalid member ID format'}), 400

    if not member:
        return jsonify({'error': 'Member not found'}), 404

    if member_id in class_doc.get('memberIds', []):
        return jsonify({'error': 'Member already in class'}), 400

    mongo.db.Classes.update_one(
        {'_id': class_id},
        {'$push': {'memberIds': member_id}}
    )
    return jsonify({'success': True, 'message': 'Member added'})

# ---------- TEACHER: REMOVE MEMBER FROM CLASS ----------
@ass_bp.delete('/class/<class_id>/remove-member/<member_id>')
@jwt_required()
def teacher_remove_member(class_id, member_id):
    uid = get_jwt_identity()
    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher not found'}), 404

    result = mongo.db.Classes.update_one(
        {'_id': class_id, 'memberIds': teacher_doc['_id'], 'isActive': True},
        {'$pull': {'memberIds': member_id}}
    )
    
    if result.modified_count == 0:
        return jsonify({'error': 'Class not found, access denied, or member not in class'}), 404

    return jsonify({'success': True, 'message': 'Member removed'})

# ---------- TEACHER: LIST ALL STUDENTS ----------
@ass_bp.get('/students')
@jwt_required()
def teacher_list_students():
    uid = get_jwt_identity()
    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher not found'}), 404

    pipeline = [
        {'$addFields': {'userIdObj': {'$toObjectId': '$userId'}}},
        {'$lookup': {'from': 'usersAuth', 'localField': 'userIdObj', 'foreignField': '_id', 'as': 'user'}},
        {'$unwind': '$user'},
        {'$project': {
            'studentId': '$_id',
            'userId': {'$toString': '$user._id'},
            'name': '$name',
            'email': '$user.email',
            'learningLevel': '$learningLevel',
            'gradeLevel': '$gradeLevel',
            'userRole': '$user.role',
            'isActive': '$user.isActive',
            'createdAt': '$user.created_at',
            '_id': 0
        }},
        {'$sort': {'name': 1}}
    ]
    students = list(mongo.db.studentData.aggregate(pipeline))
    return jsonify({'success': True, 'students': students}), 200

# ---------- TEACHER: CREATE ASSESSMENT ----------
@ass_bp.post('/create')
@jwt_required()
def create_assessment():
    uid = get_jwt_identity()
    data = request.get_json()

    # Ensure every question has _id
    for i, q in enumerate(data['questions']):
        if 'correct' not in q:
            return jsonify({'error': f'Question {i+1} missing correct answer index'}), 400
        if '_id' not in q:
            q['_id'] = str(ObjectId())
        else:
            q['_id'] = str(q['_id'])

    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher profile not found'}), 404

    teacher_id = teacher_doc['_id']
    class_cursor = mongo.db.Classes.find({'memberIds': teacher_id}, {'memberIds': 1})

    student_ids = set()
    for cls in class_cursor:
        for m in cls['memberIds']:
            if isinstance(m, str) and m.startswith('student'):
                student_ids.add(m)

    if not student_ids:
        return jsonify({
            'error': 'No students found in your classes. Please create a class and add students first.'
        }), 400

    # Parse dueDate as datetime
    try:
        due_date = datetime.datetime.fromisoformat(data['dueDate'].replace('Z', '+00:00'))
    except ValueError:
        # Fallback: assume YYYY-MM-DD
        due_date = datetime.datetime.strptime(data['dueDate'], '%Y-%m-%d')

    assessment_doc = {
        'title': data['title'],
        'description': data['description'],
        'subject': data['subject'],
        'topic': data['topic'],
        'grade': data['grade'],
        'timeLimit': data['timeLimit'],
        'dueDate': due_date, 
        'questions': data['questions'],
        'totalMarks': data['totalMarks'],
        'teacherId': uid,
        'dateOfCreation': datetime.datetime.utcnow(),
        'isActive': True,
        'gradingScale': data.get('gradingScale', [
            {"minScore": 80, "grade": "A", "result": "pass"},
            {"minScore": 60, "grade": "B", "result": "pass"},
            {"minScore": 40, "grade": "C", "result": "pass"},
            {"minScore": 0,  "grade": "F", "result": "fail"}
        ])
    }

    res = mongo.db.createAssessment.insert_one(assessment_doc)
    assessment_id = res.inserted_id  # ObjectId

    # Store assessmentId as ObjectId in studentAssessments
    pending_docs = [
        {
            'assessmentId': assessment_id,  # ← ObjectId
            'studentId': st_id,
            'status': 'pending',
            'assignedAt': datetime.datetime.utcnow()
        } for st_id in student_ids
    ]
    mongo.db.studentAssessments.insert_many(pending_docs)

    return jsonify({'success': True, 'assessmentId': str(assessment_id)}), 201

# ---------- UPDATE ASSESSMENT ----------
@ass_bp.post('/<assessment_id>/update')
@jwt_required()
def update_assessment(assessment_id):
    uid = get_jwt_identity()
    data = request.get_json()

    assessment = mongo.db.createAssessment.find_one({
        '_id': ObjectId(assessment_id),
        'teacherId': uid
    })
    if not assessment:
        return jsonify({'error': 'Assessment not found or access denied'}), 404

    if mongo.db.studentAssessments.find_one({'assessmentId': ObjectId(assessment_id), 'status': 'completed'}):
        return jsonify({'error': 'Assessment has already been attempted and cannot be updated.'}), 400

    mongo.db.createAssessment.update_one(
        {'_id': ObjectId(assessment_id)},
        {'$set': data}
    )
    return jsonify({'success': True}), 200

# ---------- REASSIGN ASSESSMENT ----------
@ass_bp.post('/<assessment_id>/reassign')
@jwt_required()
def reassign_assessment(assessment_id):
    uid = get_jwt_identity()
    assessment = mongo.db.createAssessment.find_one({
        '_id': ObjectId(assessment_id),
        'teacherId': uid
    })
    if not assessment:
        return jsonify({'error': 'Assessment not found or access denied'}), 404

    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher profile not found'}), 404

    teacher_id = teacher_doc['_id']
    class_cursor = mongo.db.Classes.find({'memberIds': teacher_id}, {'memberIds': 1})

    current_student_ids = set()
    for cls in class_cursor:
        for m in cls['memberIds']:
            if isinstance(m, str) and m.startswith('student'):
                current_student_ids.add(m)

    if not current_student_ids:
        return jsonify({'error': 'No students found in your classes. Cannot reassign.'}), 400

    existing_records = mongo.db.studentAssessments.find(
        {'assessmentId': ObjectId(assessment_id)},
        {'studentId': 1}
    )
    assigned_student_ids = {record['studentId'] for record in existing_records}
    new_student_ids = current_student_ids - assigned_student_ids

    if not new_student_ids:
        return jsonify({
            'message': 'All current students already have this assessment.',
            'newAssignments': 0
        }), 200

    new_docs = [
        {
            'assessmentId': ObjectId(assessment_id),  # ← ObjectId
            'studentId': st_id,
            'status': 'pending',
            'assignedAt': datetime.datetime.utcnow()
        } for st_id in new_student_ids
    ]
    mongo.db.studentAssessments.insert_many(new_docs)

    return jsonify({
        'success': True,
        'newAssignments': len(new_student_ids),
        'message': f'Assigned to {len(new_student_ids)} new student(s).'
    }), 200

# ---------- TEACHER: LIST ASSESSMENTS ----------
@ass_bp.get('/teacher')
@jwt_required()
def teacher_assessments():
    uid = get_jwt_identity()
    assessments = list(mongo.db.createAssessment.find(
        {'teacherId': uid},
        {'title': 1, 'subject': 1, 'grade': 1, 'questions': 1, 'dateOfCreation': 1, 'totalMarks': 1}
    ))
    for a in assessments:
        a['_id'] = str(a['_id'])
    return jsonify({'assessments': assessments})

# ---------- TEACHER: DELETE ASSESSMENT ----------
@ass_bp.delete('/<assessment_id>')
@jwt_required()
def delete_assessment(assessment_id):
    uid = get_jwt_identity()
    assessment = mongo.db.createAssessment.find_one({
        '_id': ObjectId(assessment_id),
        'teacherId': uid
    })
    if not assessment:
        return jsonify({'error': 'Assessment not found or access denied'}), 404

    if mongo.db.studentAssessments.find_one({
        'assessmentId': ObjectId(assessment_id),
        'status': 'completed'
    }):
        return jsonify({'error': 'Cannot delete: Some students have already submitted this assessment.'}), 400

    mongo.db.createAssessment.delete_one({'_id': ObjectId(assessment_id)})
    mongo.db.studentAssessments.delete_many({'assessmentId': ObjectId(assessment_id)})

    return jsonify({
        'success': True,
        'message': 'Assessment and all assignments deleted successfully.'
    }), 200

# ---------- STUDENT: LIST PENDING + COMPLETED ----------
@ass_bp.get('/student')
@jwt_required()
def student_assessments():
    uid = get_jwt_identity()
    student_doc = mongo.db.studentData.find_one({'userId': str(uid)})
    if not student_doc:
        return jsonify({'error': 'Student profile not found'}), 404

    student_id = student_doc['_id']
    current_time = datetime.datetime.utcnow()

    # PENDING
    pending_pipeline = [
        {'$match': {'studentId': student_id, 'status': 'pending'}},
        {'$lookup': {
            'from': 'createAssessment',
            'localField': 'assessmentId',
            'foreignField': '_id',
            'as': 'assessment'
        }},
        {'$unwind': '$assessment'},
        {'$match': {'assessment.dueDate': {'$gte': current_time}}},
        {'$project': {
            '_id': {'$toString': '$_id'},
            'assessmentId': {'$toString': '$assessment._id'},
            'title': '$assessment.title',
            'subject': '$assessment.subject',
            'topic': '$assessment.topic',
            'description': '$assessment.description',
            'dueDate': '$assessment.dueDate',
            'timeLimit': '$assessment.timeLimit',
            'totalMarks': '$assessment.totalMarks',
            'assignedAt': 1,
            'status': 1
        }}
    ]
    pending = list(mongo.db.studentAssessments.aggregate(pending_pipeline))

    # COMPLETED
    completed_pipeline = [
        {'$match': {'studentId': student_id, 'status': 'completed'}},
        {'$lookup': {
            'from': 'createAssessment',
            'localField': 'assessmentId',
            'foreignField': '_id',
            'as': 'assessment'
        }},
        {'$unwind': '$assessment'},
        {'$lookup': {
            'from': 'performance_evaluation',
            'localField': 'attemptID',
            'foreignField': 'attemptID',
            'as': 'performance'
        }},
        {'$unwind': '$performance'},
        {'$project': {
            '_id': {'$toString': '$_id'},
            'assessmentId': {'$toString': '$assessment._id'},
            'title': '$assessment.title',
            'subject': '$assessment.subject',
            'topic': '$assessment.topic',
            'description': '$assessment.description',
            'dueDate': '$assessment.dueDate',
            'timeLimit': '$assessment.timeLimit',
            'totalMarks': '$assessment.totalMarks',
            'score': '$performance.score',
            'grade': '$performance.grade',
            'result': '$performance.result',
            'submittedAt': 1,
            'status': 1
        }}
    ]
    completed = list(mongo.db.studentAssessments.aggregate(completed_pipeline))

    return jsonify({'pending': pending, 'completed': completed})

# ---------- STUDENT: GET QUESTIONS ----------
@ass_bp.get('/<assessment_id>/questions')
@jwt_required()
def get_questions(assessment_id):
    uid = get_jwt_identity()
    student_doc = mongo.db.studentData.find_one({'userId': uid})
    if not student_doc:
        return jsonify({'error': 'Student not found'}), 404

    student_id = student_doc['_id']
    access = mongo.db.studentAssessments.find_one({
        'assessmentId': ObjectId(assessment_id),
        'studentId': student_id,
        'status': 'pending'
    })
    if not access:
        return jsonify({'error': 'Assessment not found or already attempted'}), 404

    assessment = mongo.db.createAssessment.find_one(
        {'_id': ObjectId(assessment_id)},
        {'questions': 1, 'title': 1, 'timeLimit': 1, 'totalMarks': 1, 'subject': 1}
    )
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    return jsonify({
        'assessmentId': str(assessment['_id']),
        'title': assessment['title'],
        'subject': assessment['subject'],
        'timeLimit': assessment['timeLimit'],
        'totalMarks': assessment['totalMarks'],
        'questions': assessment['questions']
    })

# ---------- TEACHER: DASHBOARD STATS ----------
@ass_bp.get('/teacher/dashboard-stats')
@jwt_required()
def teacher_dashboard_stats():
    uid = get_jwt_identity()
    teacher_doc = mongo.db.TeacherData.find_one({'userId': uid})
    if not teacher_doc:
        return jsonify({'error': 'Teacher not found'}), 404
    teacher_id = teacher_doc['_id']

    classes = mongo.db.Classes.find({'memberIds': teacher_id, 'isActive': True}, {'memberIds': 1})
    student_ids = set()
    for cls in classes:
        for mid in cls.get('memberIds', []):
            if isinstance(mid, str) and mid.startswith('student_'):
                student_ids.add(mid)
    total_students = len(student_ids)

    total_assessments = mongo.db.createAssessment.count_documents({'teacherId': uid})

    total_materials = mongo.db.learning_materials.count_documents({"createdBy": uid})

    teacher_assessments_ids = [ass['_id'] for ass in mongo.db.createAssessment.find({'teacherId': uid}, {'_id': 1})]
    pending_submissions = mongo.db.studentAssessments.count_documents({
        'assessmentId': {'$in': teacher_assessments_ids},
        'status': 'pending'
    })

    return jsonify({
        'totalStudents': total_students,
        'totalMaterials': total_materials,
        'totalAssessments': total_assessments,
        'pendingSubmissions': pending_submissions
    })

# ---------- GET TEACHER PROFILE ----------
@ass_bp.get('/teachers/data')
@jwt_required()
def get_teacher_profile():
    uid = get_jwt_identity()
    teacher = mongo.db.TeacherData.find_one({'userId': uid}, {'_id': 0, 'userId': 0})
    if not teacher:
        return jsonify({'error': 'Teacher not found'}), 404
    return jsonify({'data': teacher})

# ---------- STUDENT: SUBMIT ATTEMPT ----------
@ass_bp.post('/<assessment_id>/submit')
@jwt_required()
def submit_attempt(assessment_id):
    uid = get_jwt_identity()
    student_doc = mongo.db.studentData.find_one({'userId': uid})
    if not student_doc:
        return jsonify({'error': 'Student not found'}), 404

    student_id = student_doc['_id']
    data = request.get_json()

    # Validate required fields
    if not data or 'answers' not in data:
        return jsonify({'error': 'Missing answers in submission'}), 400

    answers = data['answers']
    time_spent = data.get('timeSpentSec', 0)

    # Lock and update status to prevent double submission
    lock = mongo.db.studentAssessments.find_one_and_update(
        {'assessmentId': ObjectId(assessment_id), 'studentId': student_id, 'status': 'pending'},
        {'$set': {'status': 'completed'}},
        return_document=pymongo.ReturnDocument.BEFORE
    )
    if not lock:
        return jsonify({'error': 'Assessment already attempted or not assigned'}), 409

    # Fetch the assessment (including its questions) from DB
    assessment = mongo.db.createAssessment.find_one(
        {'_id': ObjectId(assessment_id)},
        {'questions': 1, 'totalMarks': 1, 'gradingScale': 1, 'subject': 1, 'topic': 1}
    )
    if not assessment:
        return jsonify({'error': 'Assessment not found'}), 404

    # Validate answer count matches question count
    questions = assessment['questions']
    if len(answers) != len(questions):
        return jsonify({'error': 'Answer count does not match question count'}), 400

    # Grade the answers
    processed_answers = []
    correct = 0

    for q, selected_option in zip(questions, answers):
        try:
            selected_option = int(selected_option)
        except (TypeError, ValueError):
            selected_option = -1  # invalid

        is_correct = (selected_option == q['correct'])
        if is_correct:
            correct += 1

        processed_answers.append({
            "questionId": str(q["_id"]),
            "selectedOption": selected_option,
            "isCorrect": is_correct
        })

    score = round((correct / len(questions)) * 100, 2)

    # Determine grade and result
    grading_scale = assessment.get('gradingScale') or [
        {"minScore": 80, "grade": "A", "result": "pass"},
        {"minScore": 60, "grade": "B", "result": "pass"},
        {"minScore": 40, "grade": "C", "result": "pass"},
        {"minScore": 0,  "grade": "F", "result": "fail"}
    ]
    grading_scale.sort(key=lambda x: x['minScore'], reverse=True)

    grade, submission_result = 'F', 'Fail'
    for rule in grading_scale:
        if score >= rule['minScore']:
            grade, submission_result = rule['grade'], rule['result']
            break

    # Save performance record
    perf_doc = {
        'attemptID': str(ObjectId()),
        'assessmentId': str(assessment['_id']),
        'studentId': student_id,
        'subject_name': assessment.get('subject', 'Unknown Subject'),
        'topic': assessment.get('topic', 'Unknown Topic'),
        'score': score,
        'grade': grade,
        'result': submission_result,
        'answers': processed_answers,
        'timeSpentSec': time_spent,
        'createdAt': datetime.datetime.utcnow()
    }

    try:
        insert_result = mongo.db.performance_evaluation.insert_one(perf_doc)
        print("Performance record inserted:", insert_result.inserted_id)
    except Exception as e:
        print("Failed to insert performance record:", str(e))
        return jsonify({'error': 'Failed to save submission'}), 500

    # Update studentAssessments with attemptID and submittedAt
    mongo.db.studentAssessments.update_one(
        {'assessmentId': ObjectId(assessment_id), 'studentId': student_id},
        {'$set': {
            'attemptID': perf_doc['attemptID'],
            'submittedAt': perf_doc['createdAt']
        }}
    )

    return jsonify({
        'success': True,
        'score': score,
        'grade': grade,
        'result': submission_result,
        'subject': assessment['subject'],
        'topic': assessment['topic'],
        'quiz_id': str(assessment['_id']),
        'attempt_date': perf_doc['createdAt'].isoformat(),
        'message': 'Assessment submitted successfully!'
    }), 200