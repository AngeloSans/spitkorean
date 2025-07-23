"use client"
import React, { useState, useEffect, useMemo } from "react"
import useLanguage from "../../hooks/useLanguage.js"
import PropTypes from "prop-types"

// Lista abrangente de atributos HTML e manipuladores de eventos que o React reconhece.
// Esta lista é baseada na documentação do React e em atributos HTML comuns.
// Ela serve como uma "whitelist" para garantir que apenas props válidas sejam passadas para o DOM.
const REACT_DOM_PROPS = new Set([
  // Standard HTML Attributes
  "accept",
  "acceptCharset",
  "accessKey",
  "action",
  "allowFullScreen",
  "allowTransparency",
  "alt",
  "async",
  "autoComplete",
  "autoFocus",
  "autoPlay",
  "capture",
  "cellPadding",
  "cellSpacing",
  "charSet",
  "checked",
  "cite",
  "classID",
  "className",
  "colSpan",
  "content",
  "contentEditable",
  "contextMenu",
  "controls",
  "coords",
  "crossOrigin",
  "data",
  "dateTime",
  "default",
  "defer",
  "dir",
  "disabled",
  "download",
  "draggable",
  "encType",
  "form",
  "formAction",
  "formEncType",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "frameBorder",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hrefLang",
  "htmlFor",
  "httpEquiv",
  "id",
  "inputMode",
  "integrity",
  "is",
  "keyParams",
  "keyType",
  "label",
  "lang",
  "list",
  "loop",
  "low",
  "manifest",
  "marginHeight",
  "marginWidth",
  "max",
  "maxLength",
  "media",
  "mediaGroup",
  "method",
  "min",
  "minLength",
  "multiple",
  "muted",
  "name",
  "noValidate",
  "nonce",
  "open",
  "optimum",
  "pattern",
  "placeholder",
  "poster",
  "preload",
  "profile",
  "radioGroup",
  "readOnly",
  "rel",
  "required",
  "reversed",
  "role",
  "rowSpan",
  "sandbox",
  "scope",
  "scoped",
  "scrolling",
  "seamless",
  "selected",
  "shape",
  "size",
  "sizes",
  "span",
  "spellCheck",
  "src",
  "srcDoc",
  "srcLang",
  "srcSet",
  "start",
  "step",
  "style",
  "summary",
  "tabIndex",
  "target",
  "title",
  "type",
  "useMap",
  "value",
  "width",
  "wmode",
  "wrap",
  // ARIA Attributes
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-colcount",
  "aria-colindex",
  "aria-colspan",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-dropeffect",
  "aria-expanded",
  "aria-flowto",
  "aria-grabbed",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-posinset",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-rowcount",
  "aria-rowindex",
  "aria-rowspan",
  "aria-selected",
  "aria-setsize",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext",
  // React Event Handlers (camelCase)
  "onAbort",
  "onAnimationEnd",
  "onAnimationIteration",
  "onAnimationStart",
  "onBlur",
  "onCanPlay",
  "onCanPlayThrough",
  "onChange",
  "onClick",
  "onCompositionEnd",
  "onCompositionStart",
  "onCompositionUpdate",
  "onContextMenu",
  "onCopy",
  "onCut",
  "onDoubleClick",
  "onDrag",
  "onDragEnd",
  "onDragEnter",
  "onDragExit",
  "onDragLeave",
  "onDragOver",
  "onDragStart",
  "onDrop",
  "onDurationChange",
  "onEmptied",
  "onEncrypted",
  "onEnded",
  "onError",
  "onFocus",
  "onInput",
  "onInvalid",
  "onKeyDown",
  "onKeyPress",
  "onKeyUp",
  "onLoad",
  "onLoadedData",
  "onLoadedMetadata",
  "onLoadStart",
  "onMouseDown",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseOut",
  "onMouseOver",
  "onMouseUp",
  "onPaste",
  "onPause",
  "onPlay",
  "onPlaying",
  "onPointerDown",
  "onPointerMove",
  "onPointerUp",
  "onPointerCancel",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerOver",
  "onPointerOut",
  "onProgress",
  "onRateChange",
  "onReset",
  "onScroll",
  "onSeeked",
  "onSeeking",
  "onSelect",
  "onStalled",
  "onSubmit",
  "onSuspend",
  "onTimeUpdate",
  "onTouchCancel",
  "onTouchEnd",
  "onTouchMove",
  "onTouchStart",
  "onTransitionEnd",
  "onVolumeChange",
  "onWaiting",
  "onWheel",
])

// Helper function to filter out non-DOM props
const filterDOMProps = (props) => {
  const filtered = {}
  for (const key in props) {
    if (key.startsWith("data-") || REACT_DOM_PROPS.has(key)) {
      filtered[key] = props[key]
    }
  }
  return filtered
}

const TranslatableText = ({
  children,
  className = "",
  fallback = "",
  as: Component = "span",
  context = "general",
  onTranslated, // Esta prop é tratada pelo próprio TranslatableText
  onComplete, // Explicitamente desestruturado para evitar passar para o DOM
  showActions, // Explicitamente desestruturado para evitar passar para o DOM
  ...restProps // Captura todas as outras props
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

  const originalText = useMemo(() => {
    let text = ""
    if (typeof children === "string") {
      text = children
    } else if (React.isValidElement(children) && typeof children.props?.children === "string") {
      text = children.props.children
    } else if (typeof fallback === "string") {
      text = fallback
    } else {
      text = ""
    }
    return String(text)
  }, [children, fallback])

  useEffect(() => {
    const translateContent = async () => {
      if (!originalText.trim()) {
        if (translatedText !== "") setTranslatedText("")
        if (error !== null) setError(null)
        return
      }
      if (currentLanguage === "ko") {
        if (translatedText !== originalText) setTranslatedText(originalText)
        if (error !== null) setError(null)
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
        if (translatedText !== (translated || originalText)) {
          setTranslatedText(translated || originalText)
        }
        if (onTranslated && typeof onTranslated === "function") {
          onTranslated(translated || originalText, originalText)
        }
      } catch (err) {
        console.error("Translation error:", err)
        const errorMessage = err instanceof Error ? err.message : "Unknown translation error"
        if (error !== errorMessage) setError(errorMessage)
        if (translatedText !== originalText) {
          setTranslatedText(originalText)
        }
      } finally {
        setIsTranslating(false)
      }
    }
    translateContent()
  }, [originalText, currentLanguage, context, translate, translateUIText, onTranslated, translatedText, error])

  const loadingClass = isTranslating || globalIsTranslating ? "opacity-75 animate-pulse" : ""
  const errorClass = error ? "text-red-500" : ""
  const combinedClassName = [className, loadingClass, errorClass].filter(Boolean).join(" ")

  // Filtra as props para passar apenas as que são reconhecidas por elementos DOM.
  // onComplete e showActions já foram desestruturadas acima, então não estarão em restProps.
  const { onComplete: _omitComplete, showActions: _omitShowActions, ...safeProps } = restProps
  const finalProps = filterDOMProps(safeProps)


  return (
    <Component
      className={combinedClassName}
      title={error ? `Translation error: ${error}` : undefined}
      {...finalProps} // Passa as props filtradas
    >
      {translatedText || originalText || fallback}
    </Component>
  )
}

TranslatableText.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  fallback: PropTypes.string,
  as: PropTypes.elementType,
  context: PropTypes.oneOf(["general", "ui", "feedback"]),
  onTranslated: PropTypes.func,
  // Adicione propTypes para onComplete e showActions se forem esperadas para serem passadas para TranslatableText
  // mas não para o elemento DOM. Por enquanto, apenas as consumimos.
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
    if (!shouldTranslate) {
      setShouldTranslate(true)
    }
  }
  const triggerProps = {
    [trigger === "hover" ? "onMouseEnter" : trigger === "focus" ? "onFocus" : "onClick"]: handleTrigger,
  }
  if (!shouldTranslate) {
    // Aplica o filtro de props aqui antes de espalhar no span
    const filteredSpanProps = filterDOMProps(props)
    return (
      <span {...triggerProps} className={`cursor-pointer ${className}`} {...filteredSpanProps}>
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
