"""
Mock data for journey content when OpenAI API is not available
"""

MOCK_JOURNEY_CONTENT = {
    "level1": {
        "hangul": {
            "title": "한글 기초 학습",
            "description": "한글 자음과 모음, 기초 단어를 학습합니다.",
            "content": {
                "text": "안녕하세요. 저는 김민수입니다. 오늘 날씨가 좋아요. 공원에서 산책해요.",
                "sentences": [
                    {"id": "mock_level1_1", "text": "안녕하세요", "translation": "Hello"},
                    {"id": "mock_level1_2", "text": "저는 김민수입니다", "translation": "I am Kim Minsu"},
                    {"id": "mock_level1_3", "text": "오늘 날씨가 좋아요", "translation": "The weather is nice today"},
                    {"id": "mock_level1_4", "text": "공원에서 산책해요", "translation": "I take a walk in the park"}
                ],
                "recommended_speed": 0.5
            },
            "guide": {
                "vocabulary": ["안녕하세요 (hello)", "날씨 (weather)", "공원 (park)", "산책 (walk)"],
                "pronunciation": ["'ㅎ' 소리는 약하게 발음", "'ㅓ' 소리는 입을 적당히 벌려서"]
            }
        },
        "reading": {
            "title": "한글 기초 읽기",
            "description": "간단한 한글 문장을 읽어보세요.",
            "content": {
                "text": "나는 학생이에요. 학교에 가요. 친구와 놀아요. 집에 가요.",
                "sentences": [
                    {"id": "mock_level1_r1", "text": "나는 학생이에요", "translation": "I am a student"},
                    {"id": "mock_level1_r2", "text": "학교에 가요", "translation": "I go to school"},
                    {"id": "mock_level1_r3", "text": "친구와 놀아요", "translation": "I play with friends"},
                    {"id": "mock_level1_r4", "text": "집에 가요", "translation": "I go home"}
                ],
                "recommended_speed": 0.5
            },
            "guide": {
                "vocabulary": ["학생 (student)", "학교 (school)", "친구 (friend)", "집 (home)"],
                "pronunciation": ["받침 'ㄴ'은 혀끝을 윗잇몸에", "'ㅏ' 소리는 입을 크게 벌려서"]
            }
        }
    },
    "level2": {
        "reading": {
            "title": "일상 한국어 읽기",
            "description": "간단한 일상 대화와 문장을 읽습니다.",
            "content": {
                "text": "어제 친구와 영화를 봤어요. 정말 재미있었어요. 오늘은 도서관에서 공부할 거예요. 내일은 가족과 시간을 보낼 예정이에요.",
                "sentences": [
                    {"id": "mock_level2_1", "text": "어제 친구와 영화를 봤어요", "translation": "Yesterday I watched a movie with a friend"},
                    {"id": "mock_level2_2", "text": "정말 재미있었어요", "translation": "It was really interesting"},
                    {"id": "mock_level2_3", "text": "오늘은 도서관에서 공부할 거예요", "translation": "Today I will study at the library"},
                    {"id": "mock_level2_4", "text": "내일은 가족과 시간을 보낼 예정이에요", "translation": "Tomorrow I plan to spend time with family"}
                ],
                "recommended_speed": 0.8
            },
            "guide": {
                "vocabulary": ["어제 (yesterday)", "영화 (movie)", "도서관 (library)", "가족 (family)"],
                "pronunciation": ["과거형 '-었어요' 발음 연습", "계획 표현 '-(으)ㄹ 거예요' 연습"]
            }
        }
    },
    "level3": {
        "reading": {
            "title": "중급 한국어 텍스트",
            "description": "뉴스, 블로그 글 등의 중급 텍스트를 읽습니다.",
            "content": {
                "text": "한국의 전통 음식 중 하나인 김치는 세계적으로 유명합니다. 김치는 배추를 주재료로 하여 만드는 발효 음식입니다. 건강에 좋은 유산균이 많이 들어있어서 많은 사람들이 좋아합니다.",
                "sentences": [
                    {"id": "mock_level3_1", "text": "한국의 전통 음식 중 하나인 김치는 세계적으로 유명합니다", "translation": "Kimchi, one of Korea's traditional foods, is world-famous"},
                    {"id": "mock_level3_2", "text": "김치는 배추를 주재료로 하여 만드는 발효 음식입니다", "translation": "Kimchi is a fermented food made with cabbage as the main ingredient"},
                    {"id": "mock_level3_3", "text": "건강에 좋은 유산균이 많이 들어있어서 많은 사람들이 좋아합니다", "translation": "Many people like it because it contains many probiotics that are good for health"}
                ],
                "recommended_speed": 1.0
            },
            "guide": {
                "vocabulary": ["전통 (tradition)", "발효 (fermentation)", "유산균 (probiotics)", "주재료 (main ingredient)"],
                "pronunciation": ["관형절 '-는' 발음", "연결어미 '-어서' 자연스럽게"]
            }
        }
    },
    "level4": {
        "reading": {
            "title": "고급 한국어 콘텐츠",
            "description": "문학 작품, 전문적인 글 등의 고급 텍스트를 읽습니다.",
            "content": {
                "text": "현대 사회에서 기술의 발전은 우리의 삶을 근본적으로 변화시키고 있습니다. 인공지능과 빅데이터의 활용은 다양한 분야에서 혁신을 가져오고 있으며, 이러한 변화는 앞으로도 계속될 것으로 예상됩니다.",
                "sentences": [
                    {"id": "mock_level4_1", "text": "현대 사회에서 기술의 발전은 우리의 삶을 근본적으로 변화시키고 있습니다", "translation": "In modern society, technological advancement is fundamentally changing our lives"},
                    {"id": "mock_level4_2", "text": "인공지능과 빅데이터의 활용은 다양한 분야에서 혁신을 가져오고 있으며", "translation": "The utilization of artificial intelligence and big data is bringing innovation in various fields"},
                    {"id": "mock_level4_3", "text": "이러한 변화는 앞으로도 계속될 것으로 예상됩니다", "translation": "Such changes are expected to continue in the future"}
                ],
                "recommended_speed": 1.2
            },
            "guide": {
                "vocabulary": ["근본적 (fundamental)", "인공지능 (AI)", "빅데이터 (big data)", "혁신 (innovation)"],
                "pronunciation": ["복합어 발음 주의", "격식체 문장 억양"]
            }
        }
    }
}

def get_mock_journey_content(level="level1", content_type="reading"):
    """
    Get mock journey content for a specific level and type
    
    Args:
        level (str): The level (level1, level2, level3, level4)
        content_type (str): The content type (hangul, reading, pronunciation, dialogue)
        
    Returns:
        dict: Mock content data
    """
    if level not in MOCK_JOURNEY_CONTENT:
        level = "level1"
    
    level_content = MOCK_JOURNEY_CONTENT[level]
    
    # Se o tipo específico não existir, usa 'reading' como padrão
    if content_type not in level_content:
        content_type = "reading"
    
    # Se ainda não existir, pega o primeiro disponível
    if content_type not in level_content:
        content_type = list(level_content.keys())[0]
    
    return level_content[content_type]

def get_all_mock_levels():
    """
    Get all available mock levels
    
    Returns:
        list: List of available levels
    """
    return list(MOCK_JOURNEY_CONTENT.keys())

def get_available_content_types(level="level1"):
    """
    Get available content types for a specific level
    
    Args:
        level (str): The level
        
    Returns:
        list: List of available content types
    """
    if level not in MOCK_JOURNEY_CONTENT:
        level = "level1"
    
    return list(MOCK_JOURNEY_CONTENT[level].keys())
