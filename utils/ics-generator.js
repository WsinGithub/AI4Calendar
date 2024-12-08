class ICSGenerator {
  constructor(event) {
    this.event = event;
  }

  generateICS() {
    return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:STANDARD
DTSTART:20241103T020000
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11
END:STANDARD
BEGIN:DAYLIGHT
DTSTART:20240310T020000
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3
END:DAYLIGHT
END:VTIMEZONE
BEGIN:VEVENT
SUMMARY:${this.event.title}
DTSTART;TZID=America/New_York:${this.formatDate(this.event.startDate)}
DTEND;TZID=America/New_York:${this.formatDate(this.event.endDate)}
${this.event.location ? `LOCATION:${this.event.location}\n` : ''}${this.event.description ? `DESCRIPTION:${this.event.description}` : ''}
END:VEVENT
END:VCALENDAR`;
  }

  formatDate(dateStr) {
    // 假设输入的 dateStr 格式类似 "20241123T090000"
    // 直接返回，因为已经是正确的格式
    return dateStr;
  }
}