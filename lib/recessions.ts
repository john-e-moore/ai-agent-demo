export type RecessionPeriod = {
  start: string;
  end: string;
};

// Approximate NBER recession periods.
// Dates are month-level and expressed in ISO format for easy comparison.
export const NBER_RECESSIONS: RecessionPeriod[] = [
  { start: "1948-11-01", end: "1949-10-01" },
  { start: "1953-07-01", end: "1954-05-01" },
  { start: "1957-08-01", end: "1958-04-01" },
  { start: "1960-04-01", end: "1961-02-01" },
  { start: "1969-12-01", end: "1970-11-01" },
  { start: "1973-11-01", end: "1975-03-01" },
  { start: "1980-01-01", end: "1980-07-01" },
  { start: "1981-07-01", end: "1982-11-01" },
  { start: "1990-07-01", end: "1991-03-01" },
  { start: "2001-03-01", end: "2001-11-01" },
  { start: "2007-12-01", end: "2009-06-01" },
  { start: "2020-02-01", end: "2020-04-01" },
];


