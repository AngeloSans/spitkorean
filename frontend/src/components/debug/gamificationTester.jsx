"use client"

import { useState } from "react"
import { useGamification } from "@/hooks/useGamification"
import { useSelector, useDispatch } from "react-redux"

const GamificationTester = () => {
  const [testResults, setTestResults] = useState([])
  const gamification = useGamification()
  const reduxState = useSelector((state) => state.gamification || {})
  const dispatch = useDispatch()

  const addTestResult = (test, result) => {
    setTestResults((prev) => [
      ...prev,
      {
        test,
        result,
        timestamp: new Date().toLocaleTimeString(),
      },
    ])
  }

  const runTest = async (testName, testFn) => {
    try {
      console.log(`🧪 Running test: ${testName}`)
      const result = await testFn()
      addTestResult(testName, { success: true, data: result })
      console.log(`✅ Test passed: ${testName}`, result)
    } catch (error) {
      addTestResult(testName, { success: false, error: error.message })
      console.error(`❌ Test failed: ${testName}`, error)
    }
  }

  const tests = {
    "Hook AddXP": () => gamification.addXP?.("test", 25),
    "Redux Direct": () => dispatch({ type: "gamification/updateXP", payload: { amount: 25 } }),
    LocalStorage: () => {
      const data = { totalXP: 100, currentLevel: 1 }
      localStorage.setItem("test_gamification", JSON.stringify(data))
      return data
    },
    "Refresh Stats": () => gamification.refreshStats?.(),
  }

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
      <h3 className="font-bold text-lg mb-3">🧪 Gamification Tester</h3>

      <div className="space-y-2 mb-4">
        <div className="text-sm">
          <strong>Hook XP:</strong> {gamification.totalXP || "undefined"}
        </div>
        <div className="text-sm">
          <strong>Redux XP:</strong> {reduxState.totalXP || "undefined"}
        </div>
        <div className="text-sm">
          <strong>Hook Level:</strong> {gamification.currentLevel || "undefined"}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {Object.entries(tests).map(([name, testFn]) => (
          <button
            key={name}
            onClick={() => runTest(name, testFn)}
            className="w-full bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            Test {name}
          </button>
        ))}
      </div>

      <div className="border-t pt-2">
        <h4 className="font-semibold text-sm mb-2">Test Results:</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {testResults.slice(-5).map((result, index) => (
            <div key={index} className="text-xs">
              <span className="font-medium">{result.timestamp}</span>:{" "}
              <span className={result.result.success ? "text-green-600" : "text-red-600"}>
                {result.test} - {result.result.success ? "✅" : "❌"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setTestResults([])}
        className="w-full mt-2 bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600"
      >
        Clear Results
      </button>
    </div>
  )
}

export default GamificationTester
