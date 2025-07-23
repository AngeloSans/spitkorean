import apiClient from "./index"

/**
 * Drama Builder API
 * 백엔드 routes/drama.py와 정확히 매칭
 */

/**
 * 드라마 문장 목록 조회
 * GET /api/v1/drama/sentences?level={level}
 * @param {string} level - 레벨 (beginner, intermediate, advanced)
 * @param {number} num_sentences - Number of sentences to fetch
 * @returns {Promise} 문장 목록
 */
export const getDramaSentences = async (level = "beginner", num_sentences = 5) => {
  try {
    console.log("Fetching drama sentences:", { level, num_sentences })

    // Usar GET conforme o backend espera
    const response = await apiClient.get(`/drama/sentences?level=${level}`)

    console.log("Drama sentences response:", response.data)

    // A resposta completa do backend, que inclui status, message e data
    const fullApiResponse = response.data

    // Verificar se a resposta tem a estrutura esperada
    if (!fullApiResponse.data) {
      console.error("Invalid response structure:", fullApiResponse)
      throw new Error("Invalid response format from backend")
    }

    // Retornar os dados conforme esperado pelo slice
    return fullApiResponse.data
  } catch (error) {
    console.error("Error fetching drama sentences:", error)

    if (error.response?.status === 401) {
      throw new Error("인증 토큰이 필요합니다")
    }

    if (error.response?.status === 403) {
      throw new Error("Drama Builder 구독이 필요합니다")
    }

    if (error.response?.status === 429) {
      throw new Error("오늘의 사용량을 초과했습니다")
    }

    throw new Error(error.response?.data?.message || "문장을 불러오는데 실패했습니다")
  }
}

/**
 * 문장 구성 확인
 * POST /api/v1/drama/check
 * @param {Object} data - 문장 체크 데이터
 * @param {string} data.sentence_id - 문장 ID
 * @param {string} data.drama_id - 드라마 ID
 * @param {string} data.user_answer - 사용자 답변
 * @param {string} data.level - 사용자 레벨
 * @returns {Promise} 체크 결과
 */
export const checkSentence = async (data) => {
  try {
    console.log("Checking sentence:", data)

    const response = await apiClient.post("/drama/check", data)

    console.log("Check sentence response:", response.data)

    return response.data.data || response.data
  } catch (error) {
    console.error("Error checking sentence:", error)

    if (error.response?.status === 401) {
      throw new Error("인증 토큰이 필요합니다")
    }

    if (error.response?.status === 403) {
      throw new Error("Drama Builder 구독이 필요합니다")
    }

    throw new Error(error.response?.data?.message || "답안 확인에 실패했습니다")
  }
}

/**
 * 드라마 진행 상황 조회
 * GET /api/v1/drama/progress
 * @returns {Promise} 진행 상황
 */
export const getDramaProgress = async () => {
  try {
    console.log("Fetching drama progress")

    const response = await apiClient.get("/drama/progress")

    console.log("Drama progress response:", response.data)

    return response.data.data || response.data
  } catch (error) {
    console.error("Error fetching drama progress:", error)

    if (error.response?.status === 401) {
      throw new Error("인증 토큰이 필요합니다")
    }

    if (error.response?.status === 403) {
      throw new Error("Drama Builder 구독이 필요합니다")
    }

    throw new Error(error.response?.data?.message || "진행 상황을 불러오는데 실패했습니다")
  }
}

/**
 * Drama 사용량 조회
 * GET /api/v1/drama/usage
 * @returns {Promise} 사용량 정보
 */
export const getDramaUsage = async () => {
  try {
    console.log("Fetching drama usage")

    const response = await apiClient.get("/drama/usage")

    console.log("Drama usage response:", response.data)

    return response.data.data || response.data
  } catch (error) {
    console.error("Error fetching drama usage:", error)

    if (error.response?.status === 401) {
      throw new Error("인증 토큰이 필요합니다")
    }

    if (error.response?.status === 403) {
      throw new Error("Drama Builder 구독이 필요합니다")
    }

    throw new Error(error.response?.data?.message || "사용량 정보를 불러오는데 실패했습니다")
  }
}

// Função para testar a conectividade da API
export const testDramaAPI = async () => {
  try {
    console.log("Testing Drama API connectivity...")

    const response = await apiClient.get("/drama/usage")

    console.log("Drama API test successful:", response.status)
    return true
  } catch (error) {
    console.error("Drama API test failed:", error)
    return false
  }
}
