"""
Mock data for drama sentences when OpenAI API is not available
"""

MOCK_DRAMA_SENTENCES = {
    "beginner": [
        {
            "id": "mock_beg_1",
            "content": "안녕하세요",
            "translation": "Hello",
            "grammar_points": ["인사", "존댓말"],
            "drama_title": "일상 대화",
            "difficulty": 1
        },
        {
            "id": "mock_beg_2", 
            "content": "고마워요",
            "translation": "Thank you",
            "grammar_points": ["감사 표현", "존댓말"],
            "drama_title": "일상 대화",
            "difficulty": 1
        },
        {
            "id": "mock_beg_3",
            "content": "괜찮아요",
            "translation": "It's okay",
            "grammar_points": ["위로", "존댓말"],
            "drama_title": "일상 대화", 
            "difficulty": 1
        },
        {
            "id": "mock_beg_4",
            "content": "미안해요",
            "translation": "I'm sorry",
            "grammar_points": ["사과", "존댓말"],
            "drama_title": "일상 대화",
            "difficulty": 1
        },
        {
            "id": "mock_beg_5",
            "content": "잘 지내세요",
            "translation": "Take care",
            "grammar_points": ["인사", "존댓말"],
            "drama_title": "일상 대화",
            "difficulty": 1
        }
    ],
    "intermediate": [
        {
            "id": "mock_int_1",
            "content": "오늘 날씨가 정말 좋네요",
            "translation": "The weather is really nice today",
            "grammar_points": ["형용사", "감탄", "존댓말"],
            "drama_title": "사랑의 불시착",
            "difficulty": 3
        },
        {
            "id": "mock_int_2",
            "content": "회의가 몇 시에 시작해요?",
            "translation": "What time does the meeting start?",
            "grammar_points": ["의문사", "시간", "존댓말"],
            "drama_title": "미생",
            "difficulty": 3
        },
        {
            "id": "mock_int_3",
            "content": "이 음식이 너무 맛있어요",
            "translation": "This food is so delicious",
            "grammar_points": ["형용사", "강조", "존댓말"],
            "drama_title": "슬기로운 의사생활",
            "difficulty": 3
        },
        {
            "id": "mock_int_4",
            "content": "내일 시간 있으시면 만날까요?",
            "translation": "If you have time tomorrow, shall we meet?",
            "grammar_points": ["조건문", "제안", "존댓말"],
            "drama_title": "사랑의 불시착",
            "difficulty": 3
        },
        {
            "id": "mock_int_5",
            "content": "병원에 가서 검사를 받아야 해요",
            "translation": "I need to go to the hospital for a checkup",
            "grammar_points": ["연결어미", "의무", "존댓말"],
            "drama_title": "슬기로운 의사생활",
            "difficulty": 3
        }
    ],
    "advanced": [
        {
            "id": "mock_adv_1",
            "content": "그런 일이 있었다니 정말 놀랍습니다",
            "translation": "I'm really surprised that such a thing happened",
            "grammar_points": ["과거 추측", "감정 표현", "존댓말"],
            "drama_title": "킹덤",
            "difficulty": 5
        },
        {
            "id": "mock_adv_2",
            "content": "법정에서 증언할 때는 신중해야 합니다",
            "translation": "You must be careful when testifying in court",
            "grammar_points": ["시간 표현", "의무", "존댓말"],
            "drama_title": "이상한 변호사 우영우",
            "difficulty": 5
        },
        {
            "id": "mock_adv_3",
            "content": "왕이 되기 위해서는 많은 희생이 필요하다",
            "translation": "Many sacrifices are needed to become a king",
            "grammar_points": ["목적", "수동태", "격식체"],
            "drama_title": "육룡이 나르샤",
            "difficulty": 5
        },
        {
            "id": "mock_adv_4",
            "content": "이 사건의 진실을 밝혀내는 것이 우리의 임무입니다",
            "translation": "It is our duty to uncover the truth of this case",
            "grammar_points": ["관형절", "명사화", "존댓말"],
            "drama_title": "이상한 변호사 우영우",
            "difficulty": 5
        },
        {
            "id": "mock_adv_5",
            "content": "백성들을 위한 정치를 하겠다고 약속했건만",
            "translation": "Although I promised to do politics for the people",
            "grammar_points": ["대조", "과거", "격식체"],
            "drama_title": "육룡이 나르샤",
            "difficulty": 5
        }
    ]
}

def get_mock_sentences(level="beginner", count=5):
    """
    Get mock drama sentences for a specific level
    
    Args:
        level (str): The difficulty level (beginner, intermediate, advanced)
        count (int): Number of sentences to return
        
    Returns:
        list: List of mock sentence dictionaries
    """
    if level not in MOCK_DRAMA_SENTENCES:
        level = "beginner"
    
    sentences = MOCK_DRAMA_SENTENCES[level]
    return sentences[:count] if count <= len(sentences) else sentences

def get_mock_drama_data(level="beginner"):
    """
    Get complete mock drama data structure
    
    Args:
        level (str): The difficulty level
        
    Returns:
        dict: Complete drama data structure
    """
    sentences = get_mock_sentences(level)
    
    drama_titles = {
        "beginner": "기초 한국어 대화",
        "intermediate": "일상 드라마 대화", 
        "advanced": "고급 드라마 대화"
    }
    
    return {
        "title": drama_titles.get(level, "한국어 드라마 대화"),
        "description": f"{level} 레벨에 적합한 드라마 대화 문장",
        "level": level,
        "sentences": sentences,
        "genre": "daily" if level == "beginner" else "drama",
        "source": "Mock Data"
    }
