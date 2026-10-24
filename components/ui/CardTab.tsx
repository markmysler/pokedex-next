// Transitional (redesign wave v9): the old "bezel tab" header now renders as
// a plain panel heading. Removed once every screen is rebuilt on .panel.
interface CardTabProps {
  icon: string;
  label: string;
  color?: string;
}

export default function CardTab({ label }: CardTabProps) {
  return (
    <div className="panel-head">
      <h2>{label}</h2>
    </div>
  );
}
