export function MasterDataListEntry({
  code,
  name,
  description,
  status,
  selected,
  disabled,
  onClick,
}: {
  code: number
  description?: string
  name: string
  status: string
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      className="port-list-item"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <strong>{name}</strong>
      {description && <span>{description}</span>}
      <span className="port-item-code">
        {status} · Codice {code}
      </span>
      {selected && <span className="selection-label">Selezionato</span>}
    </button>
  )
}
