from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import statistics
from bson import ObjectId

teacher_analytics_bp = Blueprint('teacher_analytics', __name__)

# MongoDB client will be set in the app factory
mongo = None

def init_teacher_analytics(db):
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


@teacher_analytics_bp.route('/api/assessments/teacher/analytics', methods=['GET'])
@jwt_required()
def get_teacher_analytics():
    teacher_id = get_jwt_identity()
    try:
        #Get assessments by teacher
        
        Assessments = list(mongo.db.createAssessment.find(
            {"teacherId": teacher_id},
            {"_id": 1, "title": 1}
        ))
        assessment_ids = [str(a["_id"]) for a in Assessments]

        if not assessment_ids:
            return jsonify({
                "avgScoresPerAssessment": [],
                "performanceTrend": [],
                "mostMissedQuestions": []
            })

        # Get Average Scores per Assessment
        # Get ALL evaluations for these assessments (no date limit here)
        evaluations = list(mongo.db.performance_evaluation.find(
            {"assessmentId": {"$in": assessment_ids}},
            {"assessmentId": 1, "score": 1}
        ))
        
        score_map = defaultdict(list)
        for ev in evaluations:
            score_map[ev["assessmentId"]].append(ev.get("score", 0))

        avg_scores = []
        assessment_title_map = {str(a["_id"]): a["title"] for a in Assessments}
        
        for aid in assessment_ids:
            scores = score_map.get(aid, [])
            if scores:
                avg = sum(scores) / len(scores)
                avg_scores.append({
                    "title": assessment_title_map.get(aid, "Unknown"),
                    "avgScore": round(avg, 2)
                })

        # 3. PERFORMANCE TREND (Last 2 Months)
        # FIX:before this was 30 which makes me worry of trend graph stop showing so I Increased to days=60 to capture your October data (Since today is Nov 20)
        limit_date = datetime.utcnow() - timedelta(days=60)
        
        # We fetch 'createdAt' to plot the line chart
        trend_evals = list(mongo.db.performance_evaluation.find(
            {
                "assessmentId": {"$in": assessment_ids},
                # We query widely first, then filter in Python to handle String vs Date formats strictly
            },
            {"createdAt": 1, "score": 1}
        ))

        daily_scores = defaultdict(list)
        
        for ev in trend_evals:
            raw_date = ev.get("createdAt")
            if not raw_date:
                continue
                
            final_date_obj = None

            # Handle DATE Object 
            if isinstance(raw_date, datetime):
                final_date_obj = raw_date
            # Handle STRING Object 
            elif isinstance(raw_date, str):
                try:
                    # Strip timezone Z if present for basic isoformat parsing
                    clean_str = raw_date.replace("Z", "")
                    # If it has time (T), parse it. If only YYYY-MM-DD, handle that too
                    if "T" in clean_str:
                         final_date_obj = datetime.fromisoformat(clean_str)
                    else:
                         final_date_obj = datetime.strptime(clean_str, "%Y-%m-%d")
                except:
                    continue 

            # Check if date is valid and within the last 180 days
            if final_date_obj and final_date_obj >= limit_date:
                # Group by Day (YYYY-MM-DD)
                date_key = final_date_obj.strftime("%Y-%m-%d")
                daily_scores[date_key].append(ev.get("score", 0))

        trend = []
        for date_key in sorted(daily_scores.keys()):
            day_scores = daily_scores[date_key]
            day_avg = sum(day_scores) / len(day_scores)
            trend.append({
                "date": date_key, 
                "avgScore": round(day_avg, 2)
            })

        # Most missed questions (Unchanged logic, ensuring robustness)
        # Only fetch answers where answers exist and aren't empty
        evals_with_answers = list(mongo.db.performance_evaluation.find(
            {"assessmentId": {"$in": assessment_ids}, "answers.0": {"$exists": True}},
            {"assessmentId": 1, "answers": 1}
        ))

        question_miss_count = Counter()
        
        # Map Question IDs to Question Text
        assessment_question_map = {}
        for assess in Assessments:
            
            full_ass = mongo.db.createAssessment.find_one({"_id": assess["_id"]}, {"questions": 1})
            if full_ass and "questions" in full_ass:
                assessment_question_map[str(assess["_id"])] = {
                    str(q.get("_id")): q.get("question", "Unknown Question") 
                    
                    for q in full_ass.get("questions", [])
                }

        for ev in evals_with_answers:
            aid = str(ev.get("assessmentId"))
            for ans in ev.get("answers", []):
                if ans.get("isCorrect") is False:
                    qid = str(ans.get("questionId"))
                    question_miss_count[(aid, qid)] += 1

        most_missed = []
        # Get top 5
        for (aid, qid), count in question_miss_count.most_common(5):
            a_title = assessment_title_map.get(aid, "Unknown Quiz")
            
            # Safety get question text
            q_map = assessment_question_map.get(aid, {})
            q_text = q_map.get(qid, "Question text unavailable")

            most_missed.append({
                "assessmentTitle": a_title,
                "questionText": q_text,
                "missCount": count
            })

        return jsonify({
            "avgScoresPerAssessment": avg_scores,
            "performanceTrend": trend,
            "mostMissedQuestions": most_missed
        })

    except Exception as e:
        print("Analytics error:", str(e))
        # Useful for debugging in your console
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to fetch analytics"}), 500


@teacher_analytics_bp.route('/api/assessments/teacher/students-progress', methods=['GET'])
@jwt_required()
def get_students_progress():
    auth_teacher_id = get_jwt_identity()

    teacher_profile = mongo.db.TeacherData.find_one(
        {"userId": auth_teacher_id},
        {"_id": 1}
    )
    if not teacher_profile:
        return jsonify({"students": []})
    
    teacher_profile_id = str(teacher_profile["_id"])

    classes = mongo.db.Classes.find(
        {"memberIds": teacher_profile_id, "isActive": True},
        {"memberIds": 1}
    )

    student_ids = set()
    for cls in classes:
        for member_id in cls.get("memberIds", []):
            if isinstance(member_id, str) and member_id.startswith("student_"):
                student_ids.add(member_id)

    if not student_ids:
        return jsonify({"students": []})

    student_profiles = {
        str(s["_id"]): s for s in mongo.db.studentData.find(
            {"_id": {"$in": list(student_ids)}},
            {"name": 1, "gradeLevel": 1}
        )
    }
    student_profiles = {k: serialize_doc(v) for k, v in student_profiles.items()}

    assessments = list(mongo.db.createAssessment.find(
        {"teacherId": auth_teacher_id},
        {"_id": 1, "subject": 1}
    ))
    assessment_ids = [str(a["_id"]) for a in assessments]
    assessment_subject_map = {str(a["_id"]): a.get("subject", "General") for a in assessments}

    evaluations = list(mongo.db.performance_evaluation.find(
        {
            "studentId": {"$in": list(student_ids)},
            "assessmentId": {"$in": assessment_ids}
        },
        {"studentId": 1, "assessmentId": 1, "score": 1, "grade": 1, "createdAt": 1}
    ))
    evaluations = serialize_doc(evaluations)

    student_evals = defaultdict(list)
    for ev in evaluations:
        student_evals[ev["studentId"]].append(ev)

    result = []
    for sid in student_ids:
        evals = student_evals[sid]
        scores = [ev["score"] for ev in evals]
        avg_score = round(sum(scores) / len(scores), 2) if scores else 0

        subject_scores = defaultdict(list)
        for ev in evals:
            subj = assessment_subject_map.get(ev["assessmentId"], "General")
            subject_scores[subj].append(ev["score"])

        weak_areas = [
            {"topic": subj}
            for subj, scores in subject_scores.items()
            if len(scores) > 0 and (sum(scores) / len(scores)) < 60
        ]

        # Get latest grade
        latest_grade = "N/A"
        if evals:
            sorted_evals = sorted(evals, key=lambda x: x["createdAt"], reverse=True)
            latest_grade = sorted_evals[0].get("grade", "N/A")

        profile = student_profiles.get(sid, {})
        result.append({
            "_id": sid,
            "profile": {
                "fullName": profile.get("name", "Unknown"),
                "grade": profile.get("gradeLevel", "N/A"),
                "subjects": list(subject_scores.keys()) or ["No assessments yet"]
            },
            "progress": {
                "averageScore": avg_score,
                "completedMaterials": [],
                "attemptedAssessments": [ev["assessmentId"] for ev in evals],
                "weakAreas": weak_areas,
                "latestGrade": latest_grade
            }
        })

    return jsonify({"students": result})


@teacher_analytics_bp.route('/api/assessments/teacher/student/<student_id>', methods=['GET'])
@jwt_required()
def get_student_detail(student_id):
    teacher_id = get_jwt_identity()

    teacher_profile = mongo.db.TeacherData.find_one({"userId": teacher_id})
    if not teacher_profile:
        return jsonify({"error": "Teacher not found"}), 404

    teacher_member_id = str(teacher_profile["_id"])
    classes = list(mongo.db.Classes.find(
        {"memberIds": teacher_member_id, "isActive": True},
        {"memberIds": 1}
    ))

    student_in_class = any(
        student_id in cls.get("memberIds", [])
        for cls in classes
    )

    if not student_in_class:
        return jsonify({"error": "Student not found or not in your class"}), 404

    student = mongo.db.studentData.find_one({"_id": student_id})
    if not student:
        return jsonify({"error": "Student not found"}), 404

    assessments = list(mongo.db.createAssessment.find(
        {"teacherId": teacher_id},
        {"_id": 1, "subject": 1}
    ))
    assessment_ids = [str(a["_id"]) for a in assessments]
    assessment_subject_map = {str(a["_id"]): a.get("subject", "General") for a in assessments}

    evaluations = list(mongo.db.performance_evaluation.find(
        {"studentId": student_id, "assessmentId": {"$in": assessment_ids}},
        {
            "_id": 1,
            "assessmentId": 1,
            "score": 1,
            "createdAt": 1,
            "grade": 1,
            "result": 1,
            "subject_name": 1
        }
    ))
    evaluations = serialize_doc(evaluations)

    scores = [ev["score"] for ev in evaluations]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0

    subject_scores = defaultdict(list)
    for ev in evaluations:
        subj = ev.get("subject_name", assessment_subject_map.get(ev["assessmentId"], "General"))
        subject_scores[subj].append(ev["score"])

    weak_areas = [
        {"topic": subj}
        for subj, scores_list in subject_scores.items()
        if sum(scores_list) / len(scores_list) < 60
    ]

    latest_grade = "N/A"
    if evaluations:
        sorted_evals = sorted(evaluations, key=lambda x: x["createdAt"], reverse=True)
        latest_grade = sorted_evals[0].get("grade", "N/A")

    student = serialize_doc(student)

    return jsonify({
        "student": {
            "_id": student["_id"],
            "profile": {
                "fullName": student.get("name", "Unknown"),
                "grade": student.get("gradeLevel", "N/A"),
                "subjects": list(subject_scores.keys()) or ["No assessments yet"]
            },
            "progress": {
                "averageScore": avg_score,
                "completedMaterials": [],
                "attemptedAssessments": [ev["assessmentId"] for ev in evaluations],
                "weakAreas": weak_areas,
                "latestGrade": latest_grade,
                "evaluations": evaluations
            }
        }
    })