export function MasterDataListEntry({
  code,
  name,
  status,
  selected,
  disabled,
  onClick,
}: {
  code: number
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
      <span className="port-item-code">
        {code} · {status}
      </span>
      <strong>{name}</strong>
      {selected && <span className="selection-label">Selezionato</span>}
    </button>
  )
}
