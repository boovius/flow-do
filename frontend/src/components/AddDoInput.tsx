import { useState, useRef, useEffect } from "react"
import type { DoType } from "@/types"

interface Props {
  onAdd: (title: string, doType: DoType) => void
  disabled?: boolean
}

export function AddDoInput({ onAdd, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [doType, setDoType] = useState<DoType>("normal")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const submit = () => {
    if (title.trim()) {
      onAdd(title.trim(), doType)
      setTitle("")
      setDoType("normal")
    }
    setIsOpen(false)
  }

  // Only close when focus leaves the entire form, not when moving between fields
  const handleFormBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    submit()
  }

  if (!isOpen) {
    if (disabled) {
      return (
        <div className="flex items-center gap-1.5 w-full px-1 py-1.5 text-sm text-[#a9bab3]">
          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span>Adding…</span>
        </div>
      )
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 w-full px-1 py-1.5 text-sm text-[#a9bab3] hover:text-[#7b8ea6] transition-colors"
      >
        <span className="text-base leading-none font-light">+</span>
        <span>Add</span>
      </button>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onBlur={handleFormBlur}
      className="flex items-center gap-1.5"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTitle("")
            setDoType("normal")
            setIsOpen(false)
          }
        }}
        placeholder={doType === "normal" ? "What needs doing?" : "What do you maintain?"}
        disabled={disabled}
        className="flex-1 text-sm bg-white/70 rounded px-2 py-1.5 outline-none border border-[#a9bab3]/40 focus:border-[#7b8ea6]/70 placeholder:text-[#a9bab3]/60 text-[#202945]"
      />
      <select
        value={doType}
        onChange={(e) => setDoType(e.target.value as DoType)}
        className="text-xs text-[#7b8ea6] bg-white/70 border border-[#a9bab3]/40 rounded px-1.5 py-1.5 outline-none cursor-pointer hover:border-[#7b8ea6]/70 transition-colors"
      >
        <option value="normal">Normal</option>
        <option value="maintenance">Maintenance</option>
      </select>
    </form>
  )
}
