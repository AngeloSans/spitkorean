"use client"
import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useLanguage } from "../../hooks/useLanguage.js"
import PropTypes from "prop-types"

/**
 * Automatically translatable text component
 */
const TranslatableText = ({
  children,
  className = "",
  fallback = "",
  as: Component = "span",
  context = "general",
  onTranslated,
  onComplete,    // exemplo de prop custom que NÃO deve ir para DOM
  showActions,   // idem
  ...restProps   // resto das props
}) => {
  const languageHook = useLanguage()
  const {
    currentLanguage = "ko",
    translate,
    translateUIText,
    isTranslating: globalIsTranslating = false,
  } = languageHook || {}

  const [translatedText, setTranslatedText] = useState("")
  const [isTranslating, setIsTranslating] = useState(false)
  const [error, setError] = useState(null)

  // Extract original text with safety checks
  const originalText = useMemo(() => {
    let text = ""
    if (typeof children === "string") {
      text = children
    } else if (React.isValidElement(children) && typeof children.props?.children === "string") {
      text = children.props.children
    } else if (typeof fallback === "string") {
      text = fallback
    }
    return String(text)
  }, [children, fallback])

  const translateContent = useCallback(async () => {
    if (!originalText.trim()) {
      setTranslatedText("")
      setError(null)
      return
    }
    if (currentLanguage === "ko") {
      setTranslatedText(originalText)
      setError(null)
      return
    }
    if (!translate && !translateUIText) {
      console.warn("Translation functions are not available")
      setTranslatedText(originalText)
      setError(null)
      return
    }

    try {
      setIsTranslating(true)
      setError(null)

      let translated = originalText
      switch (context) {
        case "ui":
          if (typeof translateUIText === "function") {
            const result = await translateUIText({ text: originalText })
            translated = result?.text || originalText
          }
          break
        case "feedback":
        case "general":
        default:
          if (typeof translate === "function") {
            translated = await translate(originalText, currentLanguage, "ko")
          }
          break
      }

      setTranslatedText(translated || originalText)

      if (onTranslated && typeof onTranslated === "function") {
        onTranslated(translated || originalText, originalText)
      }
      // Se quiser disparar onComplete, pode chamar aqui:
      if (onComplete && typeof onComplete === "function") {
        onComplete(translated || originalText, originalText)
      }
    } catch (err) {
      console.error("Translation error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown translation error"
      setError(errorMessage)
      setTranslatedText(originalText)
    } finally {
      setIsTranslating(false)
    }
  }, [originalText, currentLanguage, context, translate, translateUIText, onTranslated, onComplete])

  useEffect(() => {
    translateContent()
  }, [translateContent])

  const loadingClass = isTranslating || globalIsTranslating ? "opacity-75 animate-pulse" : ""
  const errorClass = error ? "text-red-500" : ""
  const combinedClassName = [className, loadingClass, errorClass].filter(Boolean).join(" ")

  // Remover do spread props inválidas para DOM:
  const { onComplete: _omitComplete, showActions: _omitShowActions, ...domProps } = restProps

  return (
    <Component
      className={combinedClassName}
      title={error ? `Translation error: ${error}` : undefined}
      {...domProps}
    >
      {translatedText || originalText || fallback}
    </Component>
  )
}

TranslatableText.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  fallback: PropTypes.string,
  as: PropTypes.elementType,
  context: PropTypes.oneOf(["general", "ui", "feedback"]),
  onTranslated: PropTypes.func,
  onComplete: PropTypes.func,
  showActions: PropTypes.bool,
}

export const T = ({ children, ...props }) => (
  <TranslatableText as="span" {...props}>
    {children}
  </TranslatableText>
)

export const TUI = ({ children, ...props }) => (
  <TranslatableText as="span" context="ui" {...props}>
    {children}
  </TranslatableText>
)

export const TFeedback = ({ children, ...props }) => (
  <TranslatableText as="div" context="feedback" {...props}>
    {children}
  </TranslatableText>
)

export const TBlock = ({ children, as = "div", ...props }) => (
  <TranslatableText as={as} {...props}>
    {children}
  </TranslatableText>
)

export const TConditional = ({ children, condition = true, fallbackText = "", ...props }) => {
  if (!condition) {
    return fallbackText || children
  }
  return <TranslatableText {...props}>{children}</TranslatableText>
}

export const TLazy = ({ children, trigger = "hover", className = "", ...props }) => {
  const [shouldTranslate, setShouldTranslate] = useState(false)
  const handleTrigger = () => {
    if (!shouldTranslate) setShouldTranslate(true)
  }
  const triggerEvent = trigger === "hover" ? "onMouseEnter" : trigger === "focus" ? "onFocus" : "onClick"
  const triggerProps = { [triggerEvent]: handleTrigger }

  if (!shouldTranslate) {
    return (
      <span {...triggerProps} className={`cursor-pointer ${className}`} {...props}>
        {children}
      </span>
    )
  }

  return (
    <TranslatableText className={className} {...props}>
      {children}
    </TranslatableText>
  )
}

export default TranslatableText
