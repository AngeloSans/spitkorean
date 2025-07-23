import os
from google.cloud import texttospeech
from tenacity import retry, stop_after_attempt, wait_random_exponential

class TTSService:

    def __init__(self):
        """Google Cloud TTS 클라이언트 초기화"""
        CREDENTIAL_PATH = os.path.abspath("app/config/credentials.json")
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = CREDENTIAL_PATH
        if not CREDENTIAL_PATH:
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS 환경변수가 설정되지 않았습니다.")

        self.client = texttospeech.TextToSpeechClient()

        # 기본 음성 설정
        self.default_voice = texttospeech.VoiceSelectionParams(
            language_code="ko-KR",
            name="ko-KR-Neural2-C",  # 여성 음성
            ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
        )

        self.male_voice = texttospeech.VoiceSelectionParams(
            language_code="ko-KR",
            name="ko-KR-Neural2-D",  # 남성 음성
            ssml_gender=texttospeech.SsmlVoiceGender.MALE
        )

        # 기본 오디오 설정
        self.audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.0,  # 1.0 = 정상 속도
            pitch=0.0,  # 0.0 = 정상 음높이
            volume_gain_db=0.0  # 0.0 = 정상 볼륨
        )

    @retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=10))
    async def synthesize_speech(self, text, voice_gender="female", speed=1.0):
        """텍스트를 음성으로 변환

        Args:
            text: 변환할 텍스트
            voice_gender: 음성 성별 (female 또는 male)
            speed: 음성 속도 (0.5 = 절반 속도, 2.0 = 두 배 속도)

        Returns:
            bytes: MP3 형식의 음성 데이터
        """
        # 음성 성별에 따른 설정
        voice = self.default_voice if voice_gender == "female" else self.male_voice

        # 오디오 설정 (속도 조절)
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=speed,
            pitch=0.0,
            volume_gain_db=0.0
        )

        # 입력 텍스트 설정
        synthesis_input = texttospeech.SynthesisInput(text=text)

        # TTS API 호출
        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )

        return response.audio_content

    @retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=10))
    async def generate_audio(self, text: str, voice_gender: str = "female", speed: float = 1.0):
        """
        텍스트를 음성으로 변환하여 오디오 데이터를 생성합니다.
        이 메서드는 synthesize_speech를 래핑하여 외부 호출과의 호환성을 제공합니다.
        """
        print("DEBUG: generate_audio method called")
        return await self.synthesize_speech(text, voice_gender, speed)

    @retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=10))
    async def generate_pronunciation_guide(self, text):
        """발음 가이드 생성

        Args:
            text: 원본 텍스트

        Returns:
            dict: 발음 가이드 (글자별 발음 정보)
        """
        import re

        # 한글 자모 분리 함수
        def decompose_hangul(char):
            """한글 글자를 자모로 분리"""
            if not re.match('[가-힣]', char):
                return char

            # 유니코드 값 계산
            code = ord(char) - ord('가')

            # 자모 분리
            choseong = code // (21 * 28)
            jungseong = (code % (21 * 28)) // 28
            jongseong = code % 28

            # 초성, 중성, 종성 매핑
            choseong_list = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
            jungseong_list = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
            jongseong_list = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

            cho = choseong_list[choseong]
            jung = jungseong_list[jungseong]
            jong = jongseong_list[jongseong] if jongseong > 0 else ''

            return (cho, jung, jong)

        # 발음 가이드 생성
        guide = []

        for char in text:
            if re.match('[가-힣]', char):
                jamo = decompose_hangul(char)

                # 초성, 중성, 종성별 발음 설명
                cho_desc = self._get_choseong_description(jamo[0])
                jung_desc = self._get_jungseong_description(jamo[1])
                jong_desc = self._get_jongseong_description(jamo[2]) if jamo[2] else None

                guide.append({
                    "char": char,
                    "jamo": "".join(jamo),
                    "pronunciation": {
                        "choseong": cho_desc,
                        "jungseong": jung_desc,
                        "jongseong": jong_desc
                    }
                })
            else:
                guide.append({
                    "char": char,
                    "jamo": char,
                    "pronunciation": None
                })

        return guide

    def _get_choseong_description(self, choseong):
        """초성 발음 설명"""
        descriptions = {
            'ㄱ': "입 뒤쪽에서 혀가 천장에 살짝 닿았다가 떨어지는 소리",
            'ㄲ': "ㄱ보다 더 세게 발음하는 된소리",
            'ㄴ': "혀끝을 윗니 뒤에 붙이고 코로 내는 소리",
            'ㄷ': "혀끝을 윗니 뒤에 붙였다가 떼는 소리",
            'ㄸ': "ㄷ보다 더 세게 발음하는 된소리",
            'ㄹ': "혀끝을 윗니 뒤에 가볍게 대었다가 떼는 소리",
            'ㅁ': "입술을 다물고 코로 내는 소리",
            'ㅂ': "입술을 다물었다가 터뜨리는 소리",
            'ㅃ': "ㅂ보다 더 세게 발음하는 된소리",
            'ㅅ': "윗니와 아랫니 사이로 공기를 내보내는 소리",
            'ㅆ': "ㅅ보다 더 세게 발음하는 된소리",
            'ㅇ': "초성에서는 발음하지 않음",
            'ㅈ': "혀를 윗잇몸에 가볍게 대고 파열시키는 소리",
            'ㅉ': "ㅈ보다 더 세게 발음하는 된소리",
            'ㅊ': "ㅈ에 ㅎ이 결합된 거센소리",
            'ㅋ': "ㄱ에 ㅎ이 결합된 거센소리",
            'ㅌ': "ㄷ에 ㅎ이 결합된 거센소리",
            'ㅍ': "ㅂ에 ㅎ이 결합된 거센소리",
            'ㅎ': "성문에서 나는 소리"
        }

        return {
            "letter": choseong,
            "description": descriptions.get(choseong, "설명이 없습니다.")
        }

    def _get_jungseong_description(self, jungseong):
        """중성 발음 설명"""
        descriptions = {
            'ㅏ': "입을 벌리고 혀를 중앙에 두고 내는 소리",
            'ㅐ': "ㅏ와 ㅣ의 중간 소리",
            'ㅑ': "ㅏ보다 더 입을 벌리고 혀를 중앙에 두고 내는 소리",
            'ㅒ': "ㅑ와 ㅣ의 중간 소리",
            'ㅓ': "입을 살짝 벌리고 혀를 뒤로 당기고 내는 소리",
            'ㅔ': "ㅓ와 ㅣ의 중간 소리",
            'ㅕ': "ㅓ보다 더 입을 벌리고 혀를 뒤로 당기고 내는 소리",
            'ㅖ': "ㅕ와 ㅣ의 중간 소리",
            'ㅗ': "입술을 동그랗게 오므리고 혀를 뒤로 당기고 내는 소리",
            'ㅘ': "ㅗ와 ㅏ를 합친 소리",
            'ㅙ': "ㅗ와 ㅐ를 합친 소리",
            'ㅚ': "ㅗ와 ㅣ를 합친 소리",
            'ㅛ': "ㅗ보다 더 입술을 오므리고 혀를 뒤로 당기고 내는 소리",
            'ㅜ': "입술을 동그랗게 오므리고 혀를 중앙에 두고 내는 ��리",
            'ㅝ': "ㅜ와 ㅓ를 합친 소리",
            'ㅞ': "ㅜ와 ㅔ를 합친 소리",
            'ㅟ': "ㅜ와 ㅣ를 합친 소리",
            'ㅠ': "ㅜ보다 더 입술을 오므리고 혀를 중앙에 두고 내는 소리",
            'ㅡ': "입을 다물고 혀를 뒤로 당기고 내는 소리",
            'ㅢ': "ㅡ와 ㅣ를 합친 소리",
            'ㅣ': "입을 옆으로 벌리고 혀를 앞으로 내고 내는 소리"
        }

        return {
            "letter": jungseong,
            "description": descriptions.get(jungseong, "설명이 없습니다.")
        }

    def _get_jongseong_description(self, jongseong):
        """종성 발음 설명"""
        descriptions = {
            'ㄱ': "입 뒤쪽에서 혀가 천장에 닿으며 발음이 끝남",
            'ㄲ': "ㄱ과 같으나 더 세게 발음함",
            'ㄳ': "ㄱ과 ㅅ이 합쳐진 소리, 실제로는 ㄱ으로 발음됨",
            'ㄴ': "혀끝을 윗니 뒤에 붙인 채로 발음이 끝남",
            'ㄵ': "ㄴ과 ㅈ이 합쳐진 소리, 실제로는 ㄴ으로 발음됨",
            'ㄶ': "ㄴ과 ㅎ이 합쳐진 소리, 실제로는 ㄴ으로 발음됨",
            'ㄷ': "혀끝을 윗ni 뒤에 붙인 채로 발음이 끝남, 실제로는 ㄷ으로 발음됨",
            'ㄹ': "혀끝을 윗니 뒤에 가볍게 댄 채로 발음이 끝남",
            'ㄺ': "ㄹ과 ㄱ이 합쳐진 소리, 실제로는 ㄱ으로 발음됨",
            'ㄻ': "ㄹ과 ㅁ이 합쳐진 소리, 실제로는 ㅁ으로 발음됨",
            'ㄼ': "ㄹ과 ㅂ이 합쳐진 소리, 실제로는 ㄹ 또는 ㅂ으로 발음됨",
            'ㄽ': "ㄹ과 ㅅ이 합쳐진 소리, 실제로는 ㄹ으로 발음됨",
            'ㄾ': "ㄹ과 ㅌ이 합쳐진 소리, 실제로는 ㄹ으로 발음됨",
            'ㄿ': "ㄹ과 ㅍ이 합쳐진 소리, 실제로는 ㄹ으로 발음됨",
            'ㅀ': "ㄹ과 ㅎ이 합쳐진 소리, 실제로는 ㄹ으로 발음됨",
            'ㅁ': "입술을 다문 채로 발음이 끝남",
            'ㅂ': "입술을 다문 채로 발음이 끝남",
            'ㅄ': "ㅂ과 ㅅ이 합쳐진 소리, 실제로는 ㅂ으로 발음됨",
            'ㅅ': "혀끝을 윗니 뒤에 가볍게 댄 채로 발음이 끝남, 실제로는 ㄷ으로 발음됨",
            'ㅆ': "ㅅ과 같으나 더 세게 발음함, 실제로는 ㄷ으로 발음됨",
            'ㅇ': "콧소리로 발음이 끝남",
            'ㅈ': "혀를 윗잇몸에 가볍게 댄 채로 발음이 끝남, 실제로는 ㄷ으로 발음됨",
            'ㅊ': "혀를 윗잇몸에 가볍게 댄 채로 발음이 끝남, 실제로는 ㄷ으로 발음됨",
            'ㅋ': "입 뒤쪽에서 혀가 천장에 닿으며 발음이 끝남, 실제로는 ㄱ으로 발음됨",
            'ㅌ': "혀끝을 윗니 뒤에 붙인 채로 발음이 끝남, 실제로는 ㄷ으로 발음됨",
            'ㅍ': "입술을 다문 채로 발음이 끝남, 실제로는 ㅂ으로 발음됨",
            'ㅎ': "성문에서 발음이 끝남, 대부분의 상황에서 발음되지 않음"
        }

        return {
            "letter": jongseong,
            "description": descriptions.get(jongseong, "설명이 없습니다.")
        }

    @retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=10))
    async def synthesize_with_emphasis(self, text, emphasized_text, voice_gender="female"):
        """강조가 있는 음성 합성

        Args:
            text: 전체 텍스트
            emphasized_text: 강조할 텍스트 (리스트)
            voice_gender: 음성 성별

        Returns:
            bytes: MP3 형식의 음성 데이터
        """
        # SSML 형식으로 변환
        ssml = '<speak>'

        # 텍스트 내 강조 부분 처리
        remaining_text = text
        for emp_text in emphasized_text:
            parts = remaining_text.split(emp_text, 1)

            if len(parts) > 1:
                ssml += parts[0]
                ssml += f'<emphasis level="strong"><prosody rate="slow" pitch="+2st">{emp_text}</prosody></emphasis>'
                remaining_text = parts[1]
            else:
                # 강조 텍스트가 없는 경우
                break

        # 남은 텍스트 추가
        ssml += remaining_text
        ssml += '</speak>'

        # 음성 성별에 따른 설정
        voice = self.default_voice if voice_gender == "female" else self.male_voice

        # 입력 텍스트 설정 (SSML)
        synthesis_input = texttospeech.SynthesisInput(ssml=ssml)

        # TTS API 호출
        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=self.audio_config
        )

        return response.audio_content

    @retry(stop=stop_after_attempt(3), wait=wait_random_exponential(min=1, max=10))
    async def synthesize_with_pauses(self, text, pause_positions, voice_gender="female"):
        """정지 지점이 있는 음성 합성

        Args:
            text: 전체 텍스트
            pause_positions: 정지 지점 인덱스 리스트
            voice_gender: 음성 성별

        Returns:
            bytes: MP3 형식의 음성 데이터
        """
        # SSML 형식으로 변환
        ssml = '<speak>'

        # 텍스트 처리
        prev_pos = 0
        for pos in sorted(pause_positions):
            if pos > prev_pos and pos < len(text):
                ssml += text[prev_pos:pos]
                ssml += '<break time="600ms"/>'
                prev_pos = pos

        # 남은 텍스트 추가
        ssml += text[prev_pos:]
        ssml += '</speak>'

        # 음성 성별에 따른 설정
        voice = self.default_voice if voice_gender == "female" else self.male_voice

        # 입력 텍스트 설정 (SSML)
        synthesis_input = texttospeech.SynthesisInput(ssml=ssml)

        # TTS API 호출
        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=self.audio_config
        )

        return response.audio_content

