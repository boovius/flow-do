import { useState, useRef, useEffect } from "react"

interface Props {
  onAdd: (title: string) => void
  disabled?: boolean
}

export function AddDoInput({ onAdd, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  const submit = () => {
    if (title.trim()) {
      onAdd(title.trim())
      setTitle("")
    }
    setIsOpen(false)
  }

  if (!isOpen) {
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
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={submit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTitle("")
            setIsOpen(false)
          }
        }}
        placeholder="What needs doing?"
        disabled={disabled}
        className="w-full text-sm bg-white/70 rounded px-2 py-1.5 outline-none border border-[#a9bab3]/40 focus:border-[#7b8ea6]/70 placeholder:text-[#a9bab3]/60 text-[#202945]"
      />
    </form>
  )
}
