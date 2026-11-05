from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from collections import defaultdict
from bson import ObjectId

# Assuming you already have `mongo` initialized globally or via init function
# If not, use the same pattern as `init_teacher_analytics`

student_analytics_bp = Blueprint('student_analytics', __name__)

mongo = None

def init_student_analytics(db):
    global mongo
    mongo = db

#  Helper: Make MongoDB documents JSON serializable
def serialize_doc(doc):
    """Recursively convert ObjectId and datetime to JSON-safe types."""
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        return {key: serialize_doc(value) for key, value in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
@student_analytics_bp.route('/api/progress/student', methods=['GET'])
@jwt_required()
def get_student_progress():
    jwt_user_id = get_jwt_identity() 
    print(f" Student progress requested by userId: {jwt_user_id}")

    try:
        #  Query studentData by 'userId' (string), NOT by _id
        student = mongo.db.studentData.find_one({"userId": jwt_user_id})
        if not student:
            print(f" No student found with userId: {jwt_user_id}")
            return jsonify({"error": "Student profile not found"}), 404

        # Now, the student's _id is "student_001" — which matches performance_evaluation.studentId
        student_id_for_evals = student["_id"]  # "student_001"

        # Fetch evaluations using student["_id"] (which is "student_001")
        evaluations = list(mongo.db.performance_evaluation.find(
            {"studentId": student_id_for_evals},  # "student_001"
            {
                "_id": 1,
                "assessmentId": 1,
                "score": 1,
                "createdAt": 1,
                "grade": 1,
                "subject_name": 1
            }
        ))
        evaluations = serialize_doc(evaluations)
        evaluations.sort(key=lambda x: x["createdAt"])

        scores = [{"date": ev["createdAt"], "score": ev["score"]} for ev in evaluations]
        average_score = round(sum(ev["score"] for ev in evaluations) / len(evaluations), 2) if evaluations else 0

        subject_scores = defaultdict(list)
        for ev in evaluations:
            subject = ev.get("subject_name") or "General"
            subject_scores[subject].append(ev["score"])

        weak_areas = [
            subject for subject, scores_list in subject_scores.items()
            if scores_list and (sum(scores_list) / len(scores_list)) < 60
        ]

        response = {
            "scores": scores,
            "materials": [],
            "totalAssessments": len(evaluations),
            "averageScore": average_score,
            "completedMaterials": 0,
            "weakAreas": weak_areas,
            "studentName": student.get("name", "Student")
        }

        return jsonify(response)

    except Exception as e:
        print("Student progress error:", str(e))
        return jsonify({"error": "Failed to load progress"}), 500