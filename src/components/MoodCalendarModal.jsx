import { useState } from "react";
import CheckInCalendar from "./CheckInCalendar";

export default function MoodCalendarModal({ renderTrigger }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      {renderTrigger({ open: () => setVisible(true) })}
      <CheckInCalendar visible={visible} onClose={() => setVisible(false)} />
    </>
  );
}
