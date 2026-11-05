from ast import Try
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import spacy
from sentence_transformers import SentenceTransformer, util
import numpy as np
import re
from bson import ObjectId

chatbot_bp = Blueprint('chatbot', __name__)

def init_chatbot(mongo_instance):
    """
    Initialize the chatbot with the Flask app and MongoDB instance
    """
    global mongo
    mongo = mongo_instance
    init_chatbot_embeddings()   

# Load the spaCy model and sentence transformer model
nlp = spacy.load("en_core_web_sm")
model = SentenceTransformer('all-MiniLM-L6-v2')

# External resources database
EXTERNAL_RESOURCES = {
    "mathematics": [
        {
            "title": "Khan Academy - Mathematics",
            "description": "Comprehensive math courses from basic arithmetic to calculus",
            "url": "https://www.khanacademy.org/math",
            "level": "all"
        },
        {
            "title": "MIT OpenCourseWare - Mathematics",
            "description": "Free lecture notes, exams, and videos from MIT",
            "url": "https://ocw.mit.edu/courses/mathematics/",
            "level": "advanced"
        }
    ],
    "science": [
        {
            "title": "NASA for Students",
            "description": "Space and science resources for all grade levels",
            "url": "https://www.nasa.gov/audience/forstudents/index.html",
            "level": "all"
        },
        {
            "title": "PhET Interactive Simulations",
            "description": "Interactive science and math simulations",
            "url": "https://phet.colorado.edu/en/simulations/",
            "level": "all"
        }
    ],
    "english": [
        {
            "title": "Purdue OWL",
            "description": "Online Writing Lab for grammar and writing skills",
            "url": "https://owl.purdue.edu/owl/purdue_owl.html",
            "level": "all"
        },
        {
            "title": "Project Gutenberg",
            "description": "Free eBooks for literature studies",
            "url": "https://www.gutenberg.org/",
            "level": "all"
        }
    ],
    "history": [
        {
            "title": "Crash Course World History",
            "description": "Engaging video series on world history",
            "url": "https://www.youtube.com/playlist?list=PL8dPuuaLjXtM-eV-Vp1m9y_9rXERX2YXF",
            "level": "intermediate"
        },
        {
            "title": "The British Museum",
            "description": "Online collection and educational resources",
            "url": "https://www.britishmuseum.org/learning/schools/teaching-resources",
            "level": "all"
        }
    ],
    "physics": [
        {
            "title": "HyperPhysics",
            "description": "Conceptual physics resources and explanations",
            "url": "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html",
            "level": "intermediate"
        },
        {
            "title": "Physics Classroom",
            "description": "Tutorials and interactive simulations for high school physics",
            "url": "https://www.physicsclassroom.com/",
            "level": "high school"
        }
    ],
    "optics": [
        {
            "title": "Optics for Kids - SPIE",
            "description": "Educational resources and activities about optics",
            "url": "https://www.spie.org/education/k12-educators/optics-for-kids",
            "level": "all"
        },
        {
            "title": "Introduction to Optics - MIT OpenCourseWare",
            "description": "Lecture notes and materials on optics",
            "url": "https://ocw.mit.edu/courses/physics/8-07-electromagnetism-ii-fall-2012/lecture-notes/",
            "level": "advanced"
        }
    ]
}

# Knowledge base about the learning platform
KNOWLEDGE_BASE = {
    "affirmative": {
        "keywords": {"yes": 3, "sure": 3, "please": 2, "okay": 2, "yeah": 2, "alright": 2, "yep": 2},
        "response": "Great! Let me get that for you.",
        "follow_up": "Here you go:"
    },
    #Dashboard
    "dashboard_numbers": {
        "keywords": {"dashboard": 4, "numbers": 4,},
        "response": "Your dashboard provides a summary of your learning progress, including completed lessons, upcoming assessments, and performance analytics. and the Numbers on dashboard is show the Quantity of the certain Tasks you have done or need to do.",
        "follow_up": "Is there something specific you'd like to know about your dashboard?"
    },
    "learning_progress":{
        "keywords": {"learning": 4, "progress": 4, "track": 3},
        "response": "You can track your learning Progress in the via Dashboard section then click upon the analytic section where you will find out all the details of it",
    },
    "progress_tracker": {
        "keywords": {"progress": 4, "tracker": 4, "track": 3},
        "response": "The progress tracker helps you monitor your learning journey by showing completed Assessments scores trend over time, Track Learning Material, and overall performance trends.",
    },
    #Learning Materials
    "search_materials": {
        "keywords": {"search": 4, "find": 4, "materials": 4, "resources": 3},
        "response": "You can search for Learning Materials in the Learning Material Section by scrolling the Page or Using Search Bar By doing CNTRL + F and then type the Topic you want to search for.",
    },
    "download materials": {
        "keywords": {"download": 4, "materials": 4, "resources": 4, "Save": 2},
        "response": "No, You cannot download the Material directly from the Platform but you can Access it anytime on the Platform.",
    },
    "types_of_materials": {
        "keywords": {"types": 4, "kinds": 4, "materials": 5,},
        "response": "We offer various types of learning materials including video lectures, reading materials, PDFs, and a whole set of materials to help you understand the concepts better.",
    },
    #Assessments
    "assessment_time": {
        "keywords": {"assessment": 4, "time": 4, "duration": 4, "limit": 3},
        "response": " The time limit for assessments varies depending on the specific assessment from 20 mins upto 120 mins. "
    },
    "retake_assessment": {
        "keywords": {"retake": 4, "assessment": 4, "try again": 3},
        "response": "No, you cannot retake an assessment once it has been submitted. However, you can review your results and learn from any mistakes made.",
    },
    "assessment_grading": {
        "keywords": {"grading": 4, "assessment": 4, "score": 3, "results": 3},
        "response": "Assessment results are calculated based on the number of correct answers and the weight of each question Detailed feedback is provided to help you understand your performance.",
    },
    #Analytics
    "track_improvement": {
        "keywords": {"track": 4, "improvement": 4, "progress": 3, "analytics": 3, "performance": 3},
        "response": "You can track your improvement over time by reviewing the analytics section on your dashboard. It provides insights into your performance trends, strengths, and areas for improvement.",
    },
    "graphs_charts": {
        "keywords": {"graphs": 4, "charts": 4, "analytics": 3, "visuals": 3},
        "response": "The analytics section includes various graphs and charts that visualize your learning progress, assessment scores, and performance trends over time.",
    },
    "materials_request": {
        "keywords": {"material": 4, "resource": 4, "help": 3, "improve": 4, "study": 3, "practice": 3, "find": 2},
        "response": "I'll find relevant materials for you.",
        "follow_up": "Searching..."
    },
    "weak_areas": {
        "keywords": {"weak": 4, "struggling": 4, "difficult": 3, "need help": 4, "weakness": 5},
        "response": "Let me check your performance data to identify your weak areas...",
        "follow_up": "Would you like me to recommend specific materials?"
    },
    "strong_areas": {
        "keywords": {"strong": 4, "good at": 4, "excellent": 3, "strength": 5, "best subject": 5},
        "response": "Let me check your performance data to identify your strong areas...",
        "follow_up": "Would you like advanced materials for these subjects?"
    },
    #Improvement Tips
    "study_plan": {
        "keywords": {"study plan": 5, "schedule": 4, "timetable": 4, "plan": 3, "organize": 3},
        "response": "Here Is your Personalized Study Plan: [https://www.vu.edu.au/about-vu/news-events/vu-blog/how-to-make-an-effective-study-plan]",
    },
    "Help_in_subject": {
        "keywords": {"help with": 4, "need help": 4, "help me": 4},
        "response": "Sure! Please specify the subject and topic you need help of.",
    },
    #Support
    "contact_support": {
        "keywords": {"contact": 4, "support": 4, "help": 2, "issue": 3, "problem": 3},
        "response": "You can contact our support team via email at support@ai-learning.com.",
    },
    #Default
    "help_me_with": {
        "keywords": {"help": 4, "help me": 3, "assist": 3, "support": 3, "assist": 1},
        "response": "I Can Help with various things like Help in guiding for navigation, can help you find learning Material according to your weakness and Can assisst in understand the analytics",
    },
    "general": {
        "keywords": {}, # No keywords needed, this is the fallback
        "response": "I'm not quite sure I understood that specific request. However, I can help you with finding Learning Materials, understanding your Assessment scores, or navigating your Dashboard.",
        "follow_up": "Try asking: 'Show me my weak topics' or 'How is my progress?'",
    },
}

# Initialize embeddings
knowledge_embeddings = None

def init_chatbot_embeddings():
    global knowledge_embeddings
    knowledge_embeddings = precompute_embeddings()

def precompute_embeddings():
    embeddings = {}
    for key, value in KNOWLEDGE_BASE.items():
        weighted_keywords = []
        for keyword, weight in value["keywords"].items():
            weighted_keywords.extend([keyword] * weight)
        
        text = " ".join(weighted_keywords) + " " + value["response"]
        embeddings[key] = model.encode(text, convert_to_tensor=True)
    return embeddings

def extract_subject_from_message(user_message):
    """Extract subject from user message"""
    subject_keywords = {
        "physics": ["physics", "phys"],
        "mathematics": ["mathematics", "math", "maths", "algebra", "geometry", "calculus"],
        "chemistry": ["chemistry", "chem"],
        "biology": ["biology", "bio"],
        "english": ["english", "eng", "writing", "grammar"],
        "history": ["history", "hist"],
        "science": ["science", "sci"]
    }
    
    msg = user_message.lower()
    for standard_subject, aliases in subject_keywords.items():
        for alias in aliases:
            if alias in msg:
                return standard_subject
                
    return None

def extract_both_subject_and_topic(user_message):
    """
    Extract both subject AND topic from a message like "help me with Physics Optics"
    Returns (subject, topic) tuple or (None, None) if can't determine
    """
    msg = user_message.lower()
    
    # Pattern matching
    patterns = [
        r"help me with (\w+)\s+(\w+)",  # "help me with physics optics"
        r"materials for (\w+)\s+(\w+)",  # "materials for physics optics"
        r"struggling with (\w+)\s+(\w+)",  # "struggling with physics optics"
        r"need help with (\w+)\s+(\w+)"  # "need help with physics optics"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, msg)
        if match:
            subject_guess = match.group(1)
            topic_guess = match.group(2)
            if extract_subject_from_message(subject_guess):
                return subject_guess, topic_guess
    
    # Try extracting subject first, then topic
    subject = extract_subject_from_message(msg)
    if subject:
        # Remove common words and the subject name to get the topic
        topic_part = re.sub(r'\b(me|my|the|a|an|some|any|help|materials|for|with|in|on|about|' + subject + r')\b', '', msg).strip()
        if topic_part:
            return subject, topic_part
    
    return None, None

def get_external_resources_for_topic(subject, topic):
    """Get external resources for a specific topic, checking both subject and topic sections"""
    # First try dedicated topic section (like "optics")
    topic_lower = topic.lower().strip()
    if topic_lower in EXTERNAL_RESOURCES:
        return EXTERNAL_RESOURCES[topic_lower]
    
    # Then try subject section filtered by topic
    subject_resources = get_external_resources(subject)
    topic_specific = [
        resource for resource in subject_resources
        if topic_lower in resource['description'].lower() or 
           topic_lower in resource['title'].lower()
    ]
    
    # Return topic-specific resources if found, otherwise all subject resources
    return topic_specific if topic_specific else subject_resources

def get_external_resources(subject):
    """Get external resources for a subject with fuzzy matching"""
    subject_lower = subject.lower()
    
    if subject_lower in EXTERNAL_RESOURCES:
        return EXTERNAL_RESOURCES[subject_lower]
    
    for key, resources in EXTERNAL_RESOURCES.items():
        if key in subject_lower or subject_lower in key:
            return resources
            
    for key, resources in EXTERNAL_RESOURCES.items():
        key_words = key.split()
        if any(word in subject_lower for word in key_words):
            return resources
            
    return []

def handle_direct_material_request(mongo, student_id, user_message, mentioned_subject):
    """
    Handle direct requests like "help me with Optics" or "materials for Physics"
    """
    subject, topic = extract_both_subject_and_topic(user_message)
    if not subject or not topic:
        if mentioned_subject:
            subject = mentioned_subject
            weak_topics = find_student_weak_areas(mongo, student_id, subject_filter=subject)
            if weak_topics:
                topic = weak_topics[0]['topic']
            else:
                # First check internal learning materials
                internal_materials = search_learning_materials(mongo, subject)
                if internal_materials:
                    # Internal materials found
                    return {
                        "response": f"**Materials for {subject.title()}**:\n" + \
                                  "\n".join([f"- {m.get('title', 'Resource')}" for m in internal_materials[:5]]),
                        "follow_up": "Which topic would you like to focus on?",
                        "category": "direct_materials",
                        "subject": subject,
                        "materials": internal_materials[:5]
                    }
                else:
                    # No internal materials, check external resources
                    external_resources = get_external_resources(subject)
                    if external_resources:
                        return {
                            "response": f"**External Resources for {subject.title()}**:\n" + \
                                      "\n".join([f"- [{resource['title']}]({resource['url']}) - {resource['description']}" for resource in external_resources[:3]]),
                            "follow_up": "Would you like me to suggest a study approach for this subject?",
                            "category": "direct_materials",
                            "subject": subject,
                            "materials": external_resources[:3]
                        }
                    else:
                        # No materials in either section
                        return {
                            "response": f"I don't have materials for {subject.title()} yet. Consider asking your teacher for recommendations or creating flashcards for key concepts.",
                            "follow_up": "Would you like help creating a study plan instead?",
                            "category": "direct_materials",
                            "materials": []
                        }
        else:
            return None
    
    #Search for internal materials for this specific topic
    internal_materials = search_topic_materials(mongo, subject, topic)
    
    #If no internal materials, search external resources
    if not internal_materials:
        # Check if topic has its own dedicated subject section in external resources
        topic_specific_external = get_external_resources_for_topic(subject, topic)
        
        # If we found external resources
        if topic_specific_external:
            resources_str = "\n".join([
                f"- [{resource['title']}]({resource['url']}) - {resource['description']}" 
                for resource in topic_specific_external[:3]
            ])
            return {
                "response": f"**External Resources for {subject.title()} - {topic.title()}**:\n{resources_str}",
                "follow_up": "These resources can help you understand the topic better.",
                "category": "direct_materials",
                "subject": subject,
                "topic": topic,
                "materials": topic_specific_external[:3]
            }
    
    # If we found internal materials or couldn't find any external ones
    if internal_materials:
        material_names = [m.get('title', 'Resource') for m in internal_materials[:5]]
        materials_names_str = "\n".join([f"- {name}" for name in material_names])
        return {
            "response": f"**Materials for {subject.title()} - {topic.title()}**:\n{materials_names_str}",
            "follow_up": "Would you like detailed information on any material?",
            "category": "direct_materials",
            "subject": subject,
            "topic": topic,
            "materials": internal_materials[:5]
        }
    
    # No materials in either section
    return {
        "response": f"I don't have materials for {subject.title()} - {topic.title()} yet. Consider asking your teacher for recommendations or creating flashcards for key concepts.",
        "follow_up": "Would you like me to help you create a study plan instead?",
        "category": "direct_materials",
        "subject": subject,
        "topic": topic,
        "materials": []
    }

def find_student_weak_areas(mongo, student_id, subject_filter=None, group_by='detailed'):
    """
    Find weak areas with flexible grouping.
    group_by options: 
      - 'subject': Aggegrates all scores per subject.
      - 'topic': Aggregates scores per topic (regardless of subject).
      - 'detailed': Aggregates by Subject + Topic unique combination (Default).
    """
    try:
        assessments = list(mongo.db.performance_evaluation.find(
            {'studentId': student_id},
            sort=[('createdAt', -1)]
        ))
        
        if not assessments:
            return None
            
        totals = {}
        counts = {}
        meta_data = {} # To store readable names based on the key
        
        for assessment in assessments:
            subject = assessment.get('subject_name', 'General')
            topic = assessment.get('topic', 'General')
            score = assessment.get('score', 0)
            
            if subject_filter and subject_filter.lower() not in subject.lower():
                continue

            # Determine how to group the data
            if group_by == 'subject':
                key = subject.lower()
                display_name = subject.title()
                key_type = "subject"
            elif group_by == 'topic':
                key = topic.lower()
                display_name = topic.title() 
                key_type = "topic"
            else: # detailed (Subject - Topic)
                key = f"{subject}|{topic}".lower()
                display_name = f"{subject.title()} - {topic.title()}"
                key_type = "detailed"

            totals[key] = totals.get(key, 0) + score
            counts[key] = counts.get(key, 0) + 1
            
            # specific metadata needed for the return object
            meta_data[key] = {
                'subject_name': subject.title(),
                'topic': topic.title(),
                'display_name': display_name
            }
        
        weak_items = []
        for key, total_score in totals.items():
            avg_score = total_score / counts[key]
            
            # Threshold is 70
            if avg_score < 70:
                item = {
                    'score': round(avg_score, 1),
                    'type': key_type
                }
                
                # Add appropriate labels based on grouping
                if group_by == 'subject':
                    item['subject_name'] = meta_data[key]['subject_name']
                    item['topic'] = "General" # Placeholder
                elif group_by == 'topic':
                    item['subject_name'] = meta_data[key]['subject_name'] # Just takes the last known subject for this topic
                    item['topic'] = meta_data[key]['topic']
                else:
                    item['subject_name'] = meta_data[key]['subject_name']
                    item['topic'] = meta_data[key]['topic']
                    
                weak_items.append(item)
        
        weak_items_sorted = sorted(weak_items, key=lambda x: x['score'])
        return weak_items_sorted if weak_items_sorted else None
        
    except Exception as e:
        current_app.logger.error(f"❌ Error finding weak areas: {str(e)}")
        return None

def find_student_strong_areas(mongo, student_id, subject_filter=None):
    """Find strong topics with optional subject filter"""
    try:
        assessments = list(mongo.db.performance_evaluation.find(
            {'studentId': student_id},
            sort=[('createdAt', -1)]
        ))
        
        if not assessments:
            return None
            
        topic_totals = {}
        topic_counts = {}
        
        for assessment in assessments:
            subject = assessment.get('subject_name')
            topic = assessment.get('topic', 'General')
            
            if subject_filter and subject_filter.lower() not in subject.lower():
                continue
                
            if not subject:
                continue
                
            score = assessment.get('score', 0)
            topic_key = f"{subject}|{topic}"
            topic_totals[topic_key] = topic_totals.get(topic_key, 0) + score
            topic_counts[topic_key] = topic_counts.get(topic_key, 0) + 1
            
        strong_topics = []
        for topic_key, total_score in topic_totals.items():
            subject, topic = topic_key.split('|')
            avg_score = total_score / topic_counts[topic_key]
            if avg_score >= 85:
                strong_topics.append({
                    'subject_name': subject.title(),
                    'topic': topic.title(),
                    'score': round(avg_score, 1),
                    'composite_key': topic_key
                })
        
        strong_topics_sorted = sorted(strong_topics, key=lambda x: x['score'], reverse=True)
        return strong_topics_sorted if strong_topics_sorted else None
        
    except Exception as e:
        current_app.logger.error(f" Error finding strong topics: {str(e)}")
        return None

def search_learning_materials(mongo, subject):
    """Search for learning materials by subject"""
    try:
        materials = list(mongo.db.learning_materials.find({
            '$or': [
                {'subject': {'$regex': subject, '$options': 'i'}},
                {'topic': {'$regex': subject, '$options': 'i'}}
            ],
            'isPublished': True
        }).limit(10))
        
        return [{
            '_id': str(m['_id']),
            'title': m.get('title', m.get('topic', 'Unnamed Material')),
            'subject': m.get('subject', 'General').title(),
            'topic': m.get('topic', 'General Topic'),
            'description': m.get('description', ''),
            'type': m.get('type', 'resource'),
            'difficulty': m.get('difficulty', 'unknown'),
            'url': m.get('url', '')
        } for m in materials]
    except Exception as e:
        current_app.logger.error(f" Error searching learning materials: {str(e)}")
        return []

def search_topic_materials(mongo, subject, topic):
    """Search for materials for a specific topic within a subject"""
    try:
        materials = list(mongo.db.learning_materials.find({
            '$and': [
                {'isPublished': True},
                {
                    '$or': [
                        {
                            'subject': {'$regex': subject, '$options': 'i'},
                            'topic': {'$regex': topic, '$options': 'i'}
                        },
                        {
                            'subject': {'$regex': subject, '$options': 'i'},
                            'title': {'$regex': topic, '$options': 'i'}
                        },
                        {
                            'subject': {'$regex': subject, '$options': 'i'},
                            'description': {'$regex': topic, '$options': 'i'}
                        }
                    ]
                }
            ]
        }).limit(10))
        
        return [{
            '_id': str(m['_id']),
            'title': m.get('title', m.get('topic', 'Unnamed Material')),
            'subject': m.get('subject', 'General').title(),
            'topic': m.get('topic', 'General Topic'),
            'description': m.get('description', ''),
            'type': m.get('type', 'resource'),
            'difficulty': m.get('difficulty', 'unknown'),
            'url': m.get('url', '')
        } for m in materials]
    except Exception as e:
        current_app.logger.error(f" Error searching topic materials: {str(e)}")
        return []

# MAIN ROUTE HANDLER
@chatbot_bp.route('/api/ai/chat', methods=['POST'])
@jwt_required()
def chat():
    try:
        if 'mongo' not in globals():
            return jsonify({"response": "Chatbot not properly initialized.", "follow_up": "Please contact support.", "materials": []}), 500
            
        data = request.get_json()
        user_message = data.get('message', '').lower().strip()
        
        if not user_message:
            return jsonify({"error": "No message provided"}), 400
            
        user_id = get_jwt_identity()
        student = mongo.db.studentData.find_one({"userId": user_id})
        if not student:
            return jsonify({"error": "Student profile not found"}), 404
            
        student_id = student['_id']
        user_embedding = model.encode(user_message, convert_to_tensor=True)

        # Extract subject from message
        mentioned_subject = extract_subject_from_message(user_message)
        
        # Intent detection
        affirmative_words = ["yes", "sure", "please", "okay", "yeah", "yep", "alright", "show", "give"]
        material_intent_words = ["material", "resource", "help", "improve", "study", "practice", "find", "get", "assist", "recommend", "suggest"]
        
        # Check if user is explicitly asking for help with a struggling subject
        is_explicit_help_request = any(phrase in user_message for phrase in [
            "help with", "struggling with", "need help", "having trouble", 
            "don't understand", "can't understand", "find materials for", 
            "materials for weakest", "help me with subject", "help with subject"
        ])
        
        # Only trigger materials when explicitly asked
        wants_materials = any(word in user_message for word in material_intent_words) or (
            any(word in user_message for word in affirmative_words) and 
            ("yes" in user_message and ("material" in user_message or "help" in user_message))
        )
        
        # ==================== ENHANCED MATCHING LOGIC ====================
        candidate_scores = []
        for category, knowledge in KNOWLEDGE_BASE.items():
            category_embedding = knowledge_embeddings[category]
            semantic_score = util.pytorch_cos_sim(user_embedding, category_embedding).item()
            
            keyword_score = 0
            matched_keywords = []
            exclusion_triggered = False
            
            if "exclude_keywords" in knowledge:
                for exclude_kw in knowledge["exclude_keywords"]:
                    if exclude_kw in user_message:
                        exclusion_triggered = True
                        break
            
            if not exclusion_triggered:
                for keyword, weight in knowledge["keywords"].items():
                    if keyword in user_message:
                        context_bonus = 1.0
                        if category.startswith("assessment_") and any(kw in user_message for kw in ["time", "retake", "graded"]):
                            context_bonus = 1.3
                        if category.startswith("improvement_") and "improve" in user_message:
                            context_bonus = 1.5
                        
                        keyword_score += weight * context_bonus
                        matched_keywords.append(keyword)
            
            penalty = 0
            is_general_category = category in ["assessments", "analytics", "dashboard", "general"]
            if is_general_category and len(matched_keywords) <= 1:
                penalty = 0.3
            
            normalized_keyword_score = min(keyword_score * 0.05, 0.3)
            final_score = (semantic_score * 0.7) + normalized_keyword_score - penalty
            
            candidate_scores.append({
                "category": category,
                "score": final_score,
                "semantic_score": semantic_score,
                "keyword_score": keyword_score,
                "matched_keywords": matched_keywords,
                "penalty": penalty,
                "excluded": exclusion_triggered
            })
        
        candidate_scores.sort(key=lambda x: x["score"], reverse=True)
        best_candidate = candidate_scores[0]
        best_match = best_candidate["category"] if best_candidate["score"] > 0.35 else "general"
        
        # ==================== HANDLE DIRECT MATERIAL REQUESTS FIRST ====================
        material_intent_detected = any(word in user_message for word in material_intent_words)
        is_weak_or_strong_query = (
            "weak" in user_message or "struggling" in user_message or
            "strong" in user_message or "good at" in user_message or
            best_match in ["weak_areas", "strong_areas", "improvement_tips"]
        )
        
        if material_intent_detected and not is_weak_or_strong_query:
            direct_material_result = handle_direct_material_request(mongo, student_id, user_message, mentioned_subject)
            if direct_material_result:
                return jsonify(direct_material_result)
    
# ==================== HANDLE WEAK TOPICS / SUBJECTS ====================
        weak_area_triggered = best_match == "weak_areas" or (
            ("weak" in user_message or "struggling" in user_message or "weak topics" in user_message) and
            "not weak" not in user_message and "not struggling" not in user_message
        )
        
        if weak_area_triggered:
            # Detect specific intent
            grouping_mode = 'detailed' # Default: Physics - Optics
            
            # Check if user specifically asked for SUBJECTS
            if "subject" in user_message and "topic" not in user_message:
                grouping_mode = 'subject'
            # Check if user specifically asked for TOPICS
            elif "topic" in user_message and "subject" not in user_message:
                grouping_mode = 'topic'
                
            weak_items = find_student_weak_areas(mongo, student_id, subject_filter=mentioned_subject, group_by=grouping_mode)
            
            if not weak_items:
                item_type_text = "subjects" if grouping_mode == 'subject' else "topics"
                if mentioned_subject:
                    response = f"I don't see any weak {item_type_text} in {mentioned_subject.title()}. Good job!"
                else:
                    response = f"I don't see any specific weak {item_type_text}. You're doing well!"
                
                return jsonify({
                    "response": response,
                    "follow_up": "Is there a specific area you want to practice?",
                    "category": "weak_areas",
                    "materials": []
                })
            
            # FORMAT RESPONSE BASED ON GROUPING MODE
            if grouping_mode == 'subject':
                # Response for "What are my weak subjects?"
                topics_list = "\n".join([
                    f"• **{item['subject_name']}** (avg score: {item['score']:.1f}%)"
                    for item in weak_items
                ])
                response = f" **Your Weak Subjects**:\n\n{topics_list}"
                follow_up = "Would you like to dig into specific topics for these subjects?"
                
            elif grouping_mode == 'topic':
                 # Response for "What are my weak topics?"
                topics_list = "\n".join([
                    f"• **{item['topic']}** (score: {item['score']:.1f}%)"
                    for item in weak_items
                ])
                response = f" **Your Weak Topics**:\n\n{topics_list}"
                follow_up = "Would you like materials for any of these topics?"

            else:
                # Default (Detailed) or Mixed Request
                topics_list = "\n".join([
                    f"• **{item['subject_name']} - {item['topic']}** (score: {item['score']:.1f}%)"
                    for item in weak_items
                ])
                response = f" **Weak Areas (Subject & Topic)**:\n\n{topics_list}"
                follow_up = "Would you like to focus on the weakest one?"
            
            # Handle explicit material request (Same as before, but taking the first item)
            if is_explicit_help_request or wants_materials:
                weakest = weak_items[0]
                # Note: Logic for fetching materials remains effectively the same, 
                # utilizing the subject/topic present in the weakest item found.
                
                internal_materials = search_topic_materials(mongo, weakest['subject_name'].lower(), weakest['topic'].lower())
                
                if internal_materials:
                    material_names = [m.get('title', 'Resource') for m in internal_materials[:5]]
                    materials_names_str = "\n".join([f"- {name}" for name in material_names])
                    
                    header_str = weakest['subject_name'] if grouping_mode == 'subject' else f"{weakest['subject_name']} - {weakest['topic']}"
                    
                    response = f" **Materials for your weakest area ({header_str}):\n\n{materials_names_str}"
                    all_materials = internal_materials[:5]
                else:
                    topic_specific_external = get_external_resources_for_topic(
                        weakest['subject_name'].lower(), 
                        weakest['topic'].lower()
                    )
                    
                    if topic_specific_external:
                        resources_str = "\n".join([
                            f"- [{resource['title']}]({resource['url']}) - {resource['description']}" 
                            for resource in topic_specific_external[:3]
                        ])
                        response = f" **External Resources for {weakest['subject_name']}**:\n{resources_str}"
                        all_materials = topic_specific_external[:3]
                    else:
                        response = f"I don't have specific materials for {weakest['subject_name']} yet."
                        all_materials = []

                return jsonify({
                    "response": response,
                    "category": "weak_areas_with_materials",
                    "target": weakest,
                    "materials": all_materials
                })
            
            return jsonify({
                "response": response,
                "follow_up": follow_up,
                "category": "weak_areas",
                "topics": weak_items,
                "materials": []
            })
        
        # ==================== HANDLE STRONG TOPICS ====================
        strong_area_triggered = best_match == "strong_areas" or (
            "strong" in user_message and "not strong" not in user_message
        )
        
        if strong_area_triggered:
            strong_topics = find_student_strong_areas(mongo, student_id, subject_filter=mentioned_subject)
            
            if not strong_topics:
                response = "I don't see specific strong areas yet. Keep working hard!"
                follow_up = "Would you like help improving in any topic?"
                return jsonify({
                    "response": response,
                    "follow_up": follow_up,
                    "category": "strong_areas",
                    "materials": []
                })
            
            if mentioned_subject:
                topics_list = "\n".join([
                    f"• **{t['topic']}** (score: {t['score']:.1f}%)"
                    for t in strong_topics
                ])
                response = f" **Strong topics in {mentioned_subject.title()}**:\n\n{topics_list}"
            else:
                topics_list = "\n".join([
                    f"• **{t['subject_name']} - {t['topic']}** (score: {t['score']:.1f}%)"
                    for t in strong_topics
                ])
                response = f" **Your strong topics** across all subjects:\n\n{topics_list}"
            
            follow_up = "Which topic would you like advanced materials for?"
            
            # Only show materials on explicit help request
            if wants_materials:
                strongest = strong_topics[0]
                # First check internal materials
                internal_materials = search_topic_materials(mongo, strongest['subject_name'].lower(), strongest['topic'].lower())
                advanced_materials = [m for m in internal_materials if m.get('difficulty') == 'advanced']
                if advanced_materials:
                    internal_materials = advanced_materials
                
                if internal_materials:
                    # Internal materials found
                    material_names = [m.get('title', 'Resource') for m in internal_materials[:5]]
                    materials_names_str = "\n".join([f"- {name}" for name in material_names])
                    response = f" **Advanced materials for your strongest topic ({strongest['subject_name']} - {strongest['topic']}, score: {strongest['score']:.1f}%):\n\n{materials_names_str}"
                    follow_up = "These will challenge you further!"
                    all_materials = internal_materials[:5]
                else:
                    # No internal materials, check external resources
                    topic_specific_external = get_external_resources_for_topic(
                        strongest['subject_name'].lower(), 
                        strongest['topic'].lower()
                    )
                    
                    if topic_specific_external:
                        # External resources found
                        resources_str = "\n".join([
                            f"- [{resource['title']}]({resource['url']}) - {resource['description']}" 
                            for resource in topic_specific_external[:3]
                        ])
                        response = f" **External Resources for {strongest['subject_name']} - {strongest['topic']}** (score: {strongest['score']:.1f}%):\n\n{resources_str}"
                        follow_up = "These resources will further enhance your skills."
                        all_materials = topic_specific_external[:3]
                    else:
                        # No materials in either section
                        response = f"I don't have materials for {strongest['subject_name']} - {strongest['topic']} yet. Consider asking your teacher for recommendations or creating flashcards for key concepts."
                        follow_up = "Would you like me to help you create a study plan instead?"
                        all_materials = []
                
                return jsonify({
                    "response": response,
                    "follow_up": follow_up,
                    "category": "strong_areas_with_materials",
                    "topics": strong_topics,
                    "target_topic": strongest,
                    "materials": all_materials[:5] if isinstance(all_materials, list) else []
                })
            
            return jsonify({
                "response": response,
                "follow_up": follow_up,
                "category": "strong_areas",
                "topics": strong_topics,
                "materials": []
            })
        
        # ==================== DEFAULT RESPONSE ====================
        response = KNOWLEDGE_BASE[best_match]["response"]
        follow_up = KNOWLEDGE_BASE[best_match].get("follow_up", "How else can I help you?")
        
        return jsonify({
            "response": response,
            "follow_up": follow_up,
            "category": best_match,
            "materials": []
        })
        
    except Exception as e:
        current_app.logger.error(f"Error in chatbot: {str(e)}", exc_info=True)
        return jsonify({
            "response": "I'm having trouble understanding your question. Could you try rephrasing it?",
            "follow_up": "Try asking: 'What are my weak topics?' or 'Help me with Physics optics'",
            "materials": []
        }), 500