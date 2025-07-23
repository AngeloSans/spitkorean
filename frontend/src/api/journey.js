const API_BASE_URL = "/api/journey" // Replace with your actual API base URL

/**
 * 리딩 콘텐츠 조회
 */
export const getJourneyContent = async (level = "level1", type = "reading") => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  const content = {
    content: {
      sentences: [{ text: "안녕하세요. 만나서 반갑습니다." }, { text: "오늘 날씨가 좋네요." }],
    },
    remaining_usage: 10,
  }
  return { data: content }
  // const response = await fetch(`${API_BASE_URL}/content?level=${level}&type=${type}`);
  // return response.json();
}

/**
 * 리딩 결과 제출
 */
export const submitJourneyReading = async (formData) => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  return { data: { success: true } }
  // const response = await fetch(`${API_BASE_URL}/submit`, {
  //   method: 'POST',
  //   body: JSON.stringify(formData),
  // });
  // return response.json();
}

/**
 * 진행 상황 조회
 */
export const getJourneyProgress = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  const progress = {
    history: [],
    level_stats: {},
    date_stats: [],
    total_readings: 5,
    total_sentences: 100,
    avg_pronunciation: 85,
  }
  return { data: progress }
  // const response = await fetch(`${API_BASE_URL}/progress`);
  // return response.json();
}

/**
 * 사용량 조회
 */
export const getJourneyUsage = async () => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500))
  const usage = {
    has_subscription: true,
    daily_limit: 20,
    remaining: 8,
    reset_at: "2024-01-01T00:00:00Z",
  }
  return { data: usage }
  // const response = await fetch(`${API_BASE_URL}/usage`);
  // return response.json();
}
