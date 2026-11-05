import os
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from collections import defaultdict
from bson import ObjectId
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
import numpy as np


from dotenv import load_dotenv
load_dotenv()

# Initialize AI models (do once at startup)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    gemini_model = genai.GenerativeModel(gemini_model_name)
else:
    gemini_model = None

# Lightweight sentence transformer for semantic matching
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Blueprint setup
ai_insights_bp = Blueprint('ai_insights', __name__)
mongo = None

def init_ai_insights(db):
    global mongo
    mongo = db

# ===== Helper Functions =====

def get_class_students(teacher_member_id):
    """Get all student IDs in teacher's active classes."""
    classes = mongo.db.Classes.find(
        {"memberIds": teacher_member_id, "isActive": True}
    )
    student_ids = set()
    for cls in classes:
        for mid in cls.get("memberIds", []):
            if isinstance(mid, str) and mid.startswith("student_"):
                student_ids.add(mid)
    return list(student_ids)

def analyze_class_performance(student_ids):
    """Analyze class performance and return structured subject-level data."""
    if not student_ids:
        return {
            "class_performance": {},
            "weak_subjects": [],
            "strong_subjects": [],
            "all_scores": []
        }

    # Fetch evaluations
    evaluations = list(mongo.db.performance_evaluation.find(
        {"studentId": {"$in": student_ids}},
        {"score": 1, "subject_name": 1, "assessmentId": 1}
    ))

    if not evaluations:
        return {
            "class_performance": {},
            "weak_subjects": [],
            "strong_subjects": [],
            "all_scores": []
        }

    # Map assessmentId → subject (fallback)
    assessment_ids = [ev["assessmentId"] for ev in evaluations if ev.get("assessmentId")]
    assessment_subject = {}
    valid_oids = []
    for aid in assessment_ids:
        if ObjectId.is_valid(aid):
            valid_oids.append(ObjectId(aid))
    if valid_oids:
        assessments = mongo.db.createAssessment.find(
            {"_id": {"$in": valid_oids}},
            {"_id": 1, "subject": 1}
        )
        assessment_subject = {str(a["_id"]): a.get("subject", "General") for a in assessments}

    # Group by subject
    subject_scores = defaultdict(list)
    all_scores = []

    for ev in evaluations:
        subject = ev.get("subject_name") or assessment_subject.get(ev.get("assessmentId"), "General")
        score = ev["score"]
        subject_scores[subject].append(score)
        all_scores.append(score)

    # Build performance summary
    class_performance = {}
    weak_subjects = []
    strong_subjects = []

    for subject, scores in subject_scores.items():
        avg = sum(scores) / len(scores)
        class_performance[subject] = {
            "average": round(avg, 2),
            "totalStudents": len(scores),
            "below60": sum(1 for s in scores if s < 60),
            "raw_scores": scores
        }
        if avg < 60:
            weak_subjects.append(subject)
        elif avg >= 80:
            strong_subjects.append(subject)

    return {
        "class_performance": class_performance,
        "weak_subjects": weak_subjects,
        "strong_subjects": strong_subjects,
        "all_scores": all_scores
    }

def generate_recommendations_with_embeddings(weak_subjects):
    """Use Sentence-Transformers to select relevant teaching strategies."""
    if not weak_subjects:
        return ["Maintain current teaching strategies — performance is strong!"]

    # Strategy bank (expand as needed)
    strategy_bank = [
        "Use visual aids and diagrams to explain abstract concepts.",
        "Assign peer tutoring sessions for collaborative learning.",
        "Break complex problems into smaller, manageable steps.",
        "Incorporate real-world examples to improve engagement.",
        "Provide additional practice worksheets with instant feedback.",
        "Review foundational concepts before introducing new topics.",
        "Use interactive quizzes to reinforce key ideas.",
        "Encourage students to explain solutions in their own words.",
        "Schedule weekly revision sessions for challenging topics.",
        "Leverage educational videos for visual learners.",
        "Introduce gamified learning activities to boost motivation.",
        "Focus on building vocabulary and terminology in context.",
        "Use analogies to relate new topics to familiar experiences.",
        "Provide scaffolded problem-solving templates.",
        "Offer one-on-one check-ins for students below 60%.",
        "Encourage group study sessions for collaborative learning.",
        "Incorporate technology tools to enhance interactive learning.",
        "Utilize formative assessments to identify learning gaps early.",
        "Adapt teaching pace based on student comprehension levels.",
        "Foster a growth mindset by celebrating effort and progress.",
        "Math strategies: Use manipulatives to teach abstract concepts.",
        "Reading strategies: Implement guided reading sessions.",
        "Scaffolded Problem-Solving: Break complex problems into micro-steps with guided practice.",
        "Concrete → Representational → Abstract (CRA) Sequence: Use manipulatives → diagrams → symbolic notation.",
        "Error Analysis Tasks: Have students identify and correct mistakes in sample solutions.",
        "Spaced Practice with Interleaving: Mix problem types across topics to boost retention.",
        "Real-World Modeling: Embed problems in authentic contexts (e.g., budgeting, architecture).",
        "PhET Simulations Integration: Use interactive simulations for abstract concepts (e.g., electric fields).",
        "Conceptual Conflict Prompts: Challenge misconceptions (e.g., “heavier objects fall faster”).",
        "Spatial Thinking with GIS Tools: Use free platforms like ArcGIS Online or Google Earth.",
        "Case Study Comparisons: Contrast regions (e.g., urban vs. rural, developed vs. developing).",
        "Map Deconstruction: Analyze map projections, symbols, and biases.",
        "Place-Based Learning: Connect local geography to global systems (e.g., watershed → ocean currents).",
        "Climate Data Interpretation: Graph and interpret real climate/weather datasets.",
        "Economic Simulations: Use tools like SimCity or online market simulators.",
        "Cost-Benefit Analysis Projects: Apply to personal, business, or policy decisions.",
        "Data Interpretation: Analyze GDP, unemployment, or inflation graphs.",
        "Behavioral Econ Demos: Show cognitive biases (e.g., anchoring, loss aversion).",
        "Real-World Policy Briefs: Evaluate fiscal/monetary policies using economic models.",
        "Particle-Level Visualization: Use animations/models to show molecular behavior.",
        "Stoichiometry Roadmaps: Provide flowcharts for mole-mass-particle conversions.",
        "Inquiry-Based Labs: Design open-ended experiments (e.g., “Determine the formula of a hydrate”).",
        "Analogies with Caution: E.g., electron shells as “apartment floors”—but clarify limitations.",
        "Safety + Ethics Integration: Discuss lab safety and real-world chemical ethics (e.g., pollution)."
    ]

    # Create context from weak subjects
    context = " ".join(weak_subjects)
    try:
        context_emb = embedding_model.encode(context)
        strategy_embs = embedding_model.encode(strategy_bank)

        # Cosine similarity
        similarities = np.dot(strategy_embs, context_emb) / (
            np.linalg.norm(strategy_embs, axis=1) * np.linalg.norm(context_emb)
        )

        # Get top 3
        top_indices = np.argsort(similarities)[-3:][::-1]
        return [strategy_bank[i] for i in top_indices]
    except Exception as e:
        print("Embedding error:", e)
        # Fallback
        return [
            f"Focus on foundational concepts in {subj}." 
            for subj in weak_subjects[:2]
        ] or ["Review core topics regularly."]

def generate_structured_insight(perf_data):
    """Generate insight object matching React component structure."""
    class_performance = perf_data["class_performance"]
    all_scores = perf_data["all_scores"]

    # Weak areas with scores
    weak_areas = [
        {"topic": subj, "avgScore": data["average"]}
        for subj, data in class_performance.items()
        if data["average"] < 60
    ]

    # Strong areas
    strong_areas = [
        {"topic": subj}
        for subj, data in class_performance.items()
        if data["average"] >= 80
    ]

    # Predicted next score (simple avg for now)
    predicted_score = round(sum(all_scores) / len(all_scores), 2) if all_scores else 70

    # Recommendations
    weak_subjects = [area["topic"] for area in weak_areas]
    recommendations = generate_recommendations_with_embeddings(weak_subjects)

    return {
        "studentName": "Your Class",
        "weakAreas": weak_areas,
        "strongAreas": strong_areas,
        "recommendations": recommendations,
        "predictedScore": predicted_score
    }

# ===== Flask Route =====

@ai_insights_bp.route('/api/ai/teacher-insights', methods=['GET'])
@jwt_required()
def get_teacher_ai_insights():
    teacher_id = get_jwt_identity()

    # Get teacher profile
    teacher_profile = mongo.db.TeacherData.find_one({"userId": teacher_id})
    if not teacher_profile:
        return jsonify({"insights": []})

    teacher_member_id = str(teacher_profile["_id"])
    student_ids = get_class_students(teacher_member_id)

    # Analyze performance
    perf_data = analyze_class_performance(student_ids)

    # Generate structured insight
    insight = generate_structured_insight(perf_data)

    return jsonify({
        "insights": [insight]  # Array to match React .map()
    })