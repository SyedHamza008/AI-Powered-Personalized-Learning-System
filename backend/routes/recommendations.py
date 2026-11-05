from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json
import logging
from bson import ObjectId
import google.generativeai as genai
import config

recommendations_bp = Blueprint('recommendations', __name__)
mongo = None
Gemini_Model_Name = None

def init_recommendations(mongo_instance, gemini_model_name):
    global mongo, Gemini_Model_Name
    mongo = mongo_instance
    genai.configure(api_key=config.Gemini_API_KEY)

def get_ai_recommendations(student_id, assessment_data, performance_data, learning_materials):
    """
    Get AI recommendations
    """
    context = {
        "student_id": student_id,
        "recent_assessment": {
            "subject": assessment_data.get('subject_name'),
            "topic": assessment_data.get('topic'),
            "score": assessment_data.get('score'),
            "grade": assessment_data.get('grade'),
            "weak_areas": identify_weak_areas(assessment_data)
        },
        "performance_history": performance_data,
        "available_materials": learning_materials
    }

    prompt = create_recommendation_prompt(context)

    try:
        # Configure Gemini
        model = genai.GenerativeModel(Gemini_Model_Name)

        # Generate content
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,
                max_output_tokens=2000
            )
        )

        if response.text:
            try:
                return json.loads(response.text)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                return create_fallback_recommendations(context)
        else:
            print("Empty response from Gemini")
            return create_fallback_recommendations(context)

    except Exception as e:
        print(f"Error calling Gemini API: {str(e)}")
        return create_fallback_recommendations(context)


def identify_weak_areas(assessment_data):
    weak_areas = []
    if assessment_data.get('score', 0) < 70:
        incorrect_answers = []
        topic = assessment_data.get('topic')
        for answer in assessment_data.get('answers', []):
            if not answer.get('isCorrect', True):
                incorrect_answers.append({
                    'question_id': answer.get('questionId'),
                    'concept': 'Specific concept from question'
                })
        weak_areas.append({
            'topic': topic,
            'confidence': 'High' if assessment_data.get('score', 0) < 60 else 'Medium',
            'confidence': 'High' if assessment_data.get('score', 0) < 50 else 'Medium',
            'current_score': assessment_data.get('score')
        })
    return weak_areas
def get_candidate_materials(weak_subject, weak_topics, limit=30):
    """
    Fetches a pool of POTENTIAL materials from DB to send to AI.
    Does NOT filter strictly by topic string to allow AI to match synonyms.
    """
    query = {
        "status": "active",
        "$or": [
            {"subject": {"$regex": f"^{weak_subject}$", "$options": "i"}}, # Match Subject (case insensitive)
            {"topics": {"$in": weak_topics}} # OR exact topic match
        ]
    }
    
    # Fetch materials (exclude binary data to save token space)
    materials = list(mongo.db.learning_materials.find(
        query, 
        {"_id": 1, "title": 1, "description": 1, "topics": 1, "difficulty": 1, "subject": 1, "type": 1, "estimatedTime": 1}
    ).limit(limit))

    # formatting for AI
    formatted = []
    for m in materials:
        m['_id'] = str(m['_id'])
        formatted.append(m)
    
    return formatted

def create_recommendation_prompt(context):
    return f"""
As an expert educational AI tutor, analyze this student's performance and provide specific recommendations in valid JSON format.

STUDENT PERFORMANCE DATA:
- Recent Assessment: {context['recent_assessment']['subject']} - {context['recent_assessment']['topic']}
- Score: {context['recent_assessment']['score']}% (Grade: {context['recent_assessment']['grade']})
- Weak Areas: {context['recent_assessment']['weak_areas']}

AVAILABLE LEARNING MATERIALS:
{json.dumps(context['available_materials'], indent=2)}

CRITICAL INSTRUCTIONS:
1. You MUST include at least 3-5 specific learning materials from the available materials list
2. Each material MUST have: _id, title, type, difficulty, topics, estimatedTime, and reason
3. Select materials that directly address the weak areas identified
4. If no materials exactly match the weak areas, select the closest matches
5. Do NOT leave the recommendedMaterials array empty

Respond ONLY with a JSON object in this exact structure—no extra text, no markdown:
{{
    "studyPlan": [
        {{
            "day": "Day 1",
            "focus": "Specific topic to study",
            "activities": ["Activity 1", "Activity 2"],
            "estimatedTime": 45,
            "materials": ["material_id_1"]
        }}
    ],
    "priorityAreas": [
        {{
            "topic": "Topic name",
            "confidence": "High/Medium/Low",
            "reason": "Why this needs focus"
        }}
    ],
    "recommendedMaterials": [
        {{
            "_id": "material_id",
            "title": "Material title",
            "type": "Material type (video, document, etc.)",
            "difficulty": "Material difficulty level",
            "topics": ["Topic 1", "Topic 2"],
            "estimatedTime": 30,
            "reason": "Why this material helps with the weak areas"
        }}
    ],
    "practiceQuizzes": [
        {{
            "topic": "Quiz topic",
            "difficulty": "Beginner/Intermediate/Advanced",
            "estimatedTime": 20,
            "focusAreas": ["Area 1", "Area 2"]
        }}
    ],
    "generalAdvice": "Personalized study advice"
}}

Focus on the weakest areas and provide actionable, specific recommendations.
"""


def create_fallback_recommendations(context):
    weak_topic = context['recent_assessment']['topic']
    weak_subject = context['recent_assessment'].get('subject_name', '')
    score = context['recent_assessment']['score']
    confidence = "High" if score < 60 else "Medium" if score < 75 else "Low"
    
    # Filter materials that match the weak topic or subject
    relevant_materials = []
    available_materials = context.get('available_materials', [])
    
    print(f"Creating fallback recommendations for {weak_topic} with {len(available_materials)} materials")
    
    # First try to find materials by exact topic match
    for material in available_materials:
        material_topics = [t.lower() for t in material.get('topics', [])]
        if weak_topic.lower() in material_topics:
            relevant_materials.append({
                "_id": material['_id'],
                "title": material['title'],
                "type": material.get('type', 'document'),
                "difficulty": material.get('difficulty', 'intermediate'),
                "topics": material.get('topics', []),
                "estimatedTime": material.get('estimatedTime', 30),
                "reason": f"This material covers {weak_topic} which was identified as a weak area",
                "files": material.get('files', []),
                "contentUrl": material.get('contentUrl')
            })
    
    # If not enough materials, try subject match
    if len(relevant_materials) < 3 and weak_subject:
        for material in available_materials:
            if material['_id'] not in [m['_id'] for m in relevant_materials]:
                material_topics = [t.lower() for t in material.get('topics', [])]
                if weak_subject.lower() in material_topics:
                    relevant_materials.append({
                        "_id": material['_id'],
                        "title": material['title'],
                        "type": material.get('type', 'document'),
                        "difficulty": material.get('difficulty', 'intermediate'),
                        "topics": material.get('topics', []),
                        "estimatedTime": material.get('estimatedTime', 30),
                        "reason": f"This material covers {weak_subject} which is related to your weak area",
                        "files": material.get('files', []),
                        "contentUrl": material.get('contentUrl')
                    })
    
    # If still not enough, add any materials
    if len(relevant_materials) < 3:
        for material in available_materials:
            if material['_id'] not in [m['_id'] for m in relevant_materials]:
                relevant_materials.append({
                    "_id": material['_id'],
                    "title": material['title'],
                    "type": material.get('type', 'document'),
                    "difficulty": material.get('difficulty', 'intermediate'),
                    "topics": material.get('topics', []),
                    "estimatedTime": material.get('estimatedTime', 30),
                    "reason": f"This material may help with general learning improvement",
                    "files": material.get('files', []),
                    "contentUrl": material.get('contentUrl')
                })
                if len(relevant_materials) >= 5:
                    break
    
    # Limit to top 5 most relevant materials
    recommended_materials = relevant_materials[:5]
    
    print(f"Returning {len(recommended_materials)} materials in fallback")
    
    return {
        "studyPlan": [
            {
                "day": "Day 1",
                "focus": f"Review {weak_topic} fundamentals",
                "activities": ["Watch introductory videos", "Practice basic problems"],
                "estimatedTime": 45,
                "materials": [m["_id"] for m in recommended_materials[:2]]
            },
            {
                "day": "Day 2", 
                "focus": f"Practice {weak_topic} applications",
                "activities": ["Solve practice problems", "Review mistakes"],
                "estimatedTime": 60,
                "materials": [m["_id"] for m in recommended_materials[2:4]] if len(recommended_materials) > 2 else []
            }
        ],
        "priorityAreas": [
            {
                "topic": weak_topic,
                "confidence": confidence,
                "reason": f"Scored {score}% on recent assessment"
            }
        ],
        "recommendedMaterials": recommended_materials,
        "practiceQuizzes": [
            {
                "topic": weak_topic,
                "difficulty": "Beginner",
                "estimatedTime": 20,
                "focusAreas": ["Basic concepts", "Fundamental principles"]
            }
        ],
        "generalAdvice": f"Focus on understanding the core concepts of {weak_topic}. Practice regularly and review your mistakes."
    }


@recommendations_bp.route('/api/ai/recommendations', methods=['GET'])
@jwt_required()
def get_ai_recommendations_route():
    try:
        student_uid = get_jwt_identity()
        print(f"Fetching recommendations for student: {student_uid}")

        # Get student data
        student_data = mongo.db.studentData.find_one({"userId": student_uid})
        if not student_data:
            print("Student data not found")
            return jsonify({"error": "Student not found"}), 404
        student_id = str(student_data['_id'])

        latest_assessment = mongo.db.performance_evaluation.find_one(
            {"studentId": student_id},
            sort=[("createdAt", -1)]
        )
        if not latest_assessment:
            print("No assessment data found")
            return jsonify({"error": "No assessment data found"}), 404

        performance_history = list(mongo.db.performance_evaluation.find(
            {"studentId": student_id},
            sort=[("createdAt", -1)],
            limit=5
        ))

        # Get weak areas from the latest assessment
        weak_areas = identify_weak_areas(latest_assessment)
        weak_topics = [area['topic'] for area in weak_areas]
        print(f"Weak topics identified: {weak_topics}")
        
        # Fetch materials that match weak topics
        learning_materials = []
        
        # First try to get materials by exact topic match
        if weak_topics:
            learning_materials = list(mongo.db.learning_materials.find({
                "topics": {"$in": weak_topics},
                "status": "active"
            }))
            print(f"Found {len(learning_materials)} materials by exact topic match")
            
            # If not enough materials, try by subject
            if len(learning_materials) < 5:
                subject_materials = list(mongo.db.learning_materials.find({
                    "topics": latest_assessment.get('subject_name'),
                    "status": "active",
                    "_id": {"$nin": [m['_id'] for m in learning_materials]}
                }))
                learning_materials.extend(subject_materials)
                print(f"Added {len(subject_materials)} materials by subject match")
                
            # If still not enough, get any active materials
            if len(learning_materials) < 5:
                additional_materials = list(mongo.db.learning_materials.find({
                    "status": "active",
                    "_id": {"$nin": [m['_id'] for m in learning_materials]}
                }).limit(5 - len(learning_materials)))
                learning_materials.extend(additional_materials)
                print(f"Added {len(additional_materials)} additional materials")
        
        # Log materials for debugging
        print(f"Total materials available: {len(learning_materials)}")
        for material in learning_materials:
            print(f"Material: {material.get('title')} - Topics: {material.get('topics')}")

        # Convert ObjectId to string and handle datetime fields
        for material in learning_materials:
            material['_id'] = str(material['_id'])
            # Convert datetime fields to strings
            if 'createdAt' in material and material['createdAt']:
                material['createdAt'] = material['createdAt'].isoformat()
            if 'updatedAt' in material and material['updatedAt']:
                material['updatedAt'] = material['updatedAt'].isoformat()

        recommendations = get_ai_recommendations(
            student_id, 
            latest_assessment, 
            performance_history, 
            learning_materials
        )

        # Check if materials were included in recommendations
        if not recommendations.get('recommendedMaterials'):
            print("WARNING: No materials in recommendations, using fallback")
            recommendations = create_fallback_recommendations({
                "recent_assessment": {
                    "subject": latest_assessment.get('subject_name'),
                    "topic": latest_assessment.get('topic'),
                    "score": latest_assessment.get('score'),
                    "grade": latest_assessment.get('grade'),
                    "weak_areas": weak_areas
                },
                "available_materials": learning_materials
            })

        # Create recommendation document with proper datetime handling
        current_time = datetime.utcnow()
        recommendation_doc = {
            "studentId": student_id,
            "assessmentId": str(latest_assessment.get('_id')),
            "recommendations": recommendations,
            "generatedAt": current_time,
            "aiModel": "gemini-2.0-flash"
        }

        # Insert into database
        mongo.db.ai_recommendations.insert_one(recommendation_doc)

        # Prepare response with proper datetime handling
        response_data = {
            "success": True,
            "recommendations": recommendations,
            "assessment": {
                "subject": latest_assessment.get('subject_name'),
                "topic": latest_assessment.get('topic'),
                "score": latest_assessment.get('score')
            },
            "generatedAt": current_time.isoformat()
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"Error in AI recommendations: {str(e)}")
        return jsonify({"error": "Failed to generate recommendations"}), 500

@recommendations_bp.route('/api/materials/details', methods=['POST'])
@jwt_required()
def get_materials_details():
    """Get details for multiple materials by their IDs"""
    try:
        data = request.get_json()
        material_ids = data.get('material_ids', [])
        
        if not material_ids:
            return jsonify({"error": "No material IDs provided"}), 400
            
        # Convert string IDs to ObjectId
        object_ids = [ObjectId(id) for id in material_ids]
        
        # Fetch materials
        materials = list(mongo.db.learning_materials.find({
            "_id": {"$in": object_ids},
            "status": "active"
        }))
        
        # Convert ObjectId to string and format response
        formatted_materials = []
        for material in materials:
            formatted_material = {
                "_id": str(material["_id"]),
                "title": material.get("title"),
                "description": material.get("description"),
                "type": material.get("type"),
                "difficulty": material.get("difficulty"),
                "topics": material.get("topics", []),
                "estimatedTime": material.get("estimatedTime"),
                "files": material.get("files", []),
                "contentUrl": material.get("contentUrl")
            }
            formatted_materials.append(formatted_material)
            
        return jsonify({
            "success": True,
            "materials": formatted_materials
        })
        
    except Exception as e:
        print(f"Error fetching material details: {str(e)}")
        return jsonify({"error": "Failed to fetch material details"}), 500

@recommendations_bp.route('/api/ai/generate-quiz', methods=['POST'])
@jwt_required()
def generate_ai_quiz():
    try:
        data = request.get_json()
        topic = data.get('topic')
        difficulty = data.get('difficulty', 'beginner')
        student_uid = get_jwt_identity()

        student_data = mongo.db.studentData.find_one({"userId": student_uid})
        if not student_data:
            return jsonify({"error": "Student not found"}), 404

        # Build prompt for quiz
        prompt = f"""
Generate a {difficulty} level quiz on the topic: {topic}
for a student at {student_data.get('learningLevel', 'intermediate')} level.

Create exactly 5 multiple choice questions in valid JSON format with this structure—no extra text:
{{
    "quizTitle": "Quiz on {topic}",
    "questions": [
        {{
            "question": "Question text",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correctAnswer": 0,
            "explanation": "Explanation why this is correct"
        }}
    ],
    "estimatedTime": 15,
    "difficulty": "{difficulty}"
}}
"""

        # Use the API Key from your config file
        if not config.Gemini_API_KEY:
            return jsonify({"error": "Server configuration error: API Key missing"}), 500

        genai.configure(api_key=config.Gemini_API_KEY)
        
        # FIX: Use the model name from config instead of hardcoding 'gemini-1.5-pro'
        # This will use 'gemini-1.5-flash' from your config.py, which usually fixes the 404 error
        model_name = getattr(config, 'Gemini_Model_Name', 'gemini-1.5-flash')
        model = genai.GenerativeModel(model_name)

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.6,
                max_output_tokens=1000
            )
        )

        if response.text:
            # Clean any potential markdown formatting
            clean_text = response.text.replace('```json', '').replace('```', '').strip()
            quiz = json.loads(clean_text)
            return jsonify({"quiz": quiz})
        else:
            raise ValueError("Empty response from Gemini")

    except Exception as e:
        print(f"Quiz generation error: {str(e)}")
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500

@recommendations_bp.route('/api/ai/test-materials', methods=['GET'])
@jwt_required()
def test_materials():
    """Test endpoint to check available materials"""
    try:
        student_uid = get_jwt_identity()
        student_data = mongo.db.studentData.find_one({"userId": student_uid})
        if not student_data:
            return jsonify({"error": "Student not found"}), 404
        student_id = student_data['_id']

        latest_assessment = mongo.db.performance_evaluation.find_one(
            {"studentId": student_id},
            sort=[("createdAt", -1)]
        )
        if not latest_assessment:
            return jsonify({"error": "No assessment data found"}), 404

        # Get weak areas
        weak_areas = identify_weak_areas(latest_assessment)
        weak_topics = [area['topic'] for area in weak_areas]
        
        # Get materials
        materials = list(mongo.db.learning_materials.find({"status": "active"}).limit(10))
        
        # Format for response
        formatted_materials = []
        for material in materials:
            formatted_materials.append({
                "_id": str(material["_id"]),
                "title": material.get("title"),
                "topics": material.get("topics", []),
                "type": material.get("type"),
                "difficulty": material.get("difficulty")
            })
        
        return jsonify({
            "student_id": str(student_id),
            "weak_topics": weak_topics,
            "materials_count": len(formatted_materials),
            "materials": formatted_materials
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500