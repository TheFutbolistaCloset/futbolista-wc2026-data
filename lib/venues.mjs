// openfootball ground string → Hebrew host-city name (WC2026, 16 host cities).
// City only (suburb in parens dropped) for clean RTL display. Names via the
// gal-hebrew lexicon (2026-06-13). "ניו יורק / ניו ג׳רזי" matches Gal's brief.
// Variant-prone (pending Gal's confirm): גוודלחרה / יוסטון / מונטריי.
export const VENUES_HE = {
  'Atlanta': 'אטלנטה',
  'Boston (Foxborough)': 'בוסטון',
  'Dallas (Arlington)': 'דאלאס',
  'Guadalajara (Zapopan)': 'גוודלחרה',
  'Houston': 'יוסטון',
  'Kansas City': 'קנזס סיטי',
  'Los Angeles (Inglewood)': 'לוס אנג׳לס',
  'Mexico City': 'מקסיקו סיטי',
  'Miami (Miami Gardens)': 'מיאמי',
  'Monterrey (Guadalupe)': 'מונטריי',
  'New York/New Jersey (East Rutherford)': 'ניו יורק / ניו ג׳רזי',
  'Philadelphia': 'פילדלפיה',
  'San Francisco Bay Area (Santa Clara)': 'סן פרנסיסקו',
  'Seattle': 'סיאטל',
  'Toronto': 'טורונטו',
  'Vancouver': 'ונקובר',
};

export function venueHe(ground) {
  return VENUES_HE[ground] || ground || '';
}
