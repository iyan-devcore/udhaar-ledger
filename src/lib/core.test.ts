import { describe, expect, it } from "vitest";
import { formatPaise, groupIndian, paiseToDecimal, parseRupeesToPaise } from "./money";
import {
  addDays,
  daysBetween,
  dueDateInMonth,
  isValidISODate,
  lastPassedDueDate,
  monthRange,
  nextDueDate,
  shiftYearMonth,
  todayIn,
  formatDayMonth,
} from "./dates";
import { computeBalance, computeOverdue, customerStatus, withRunningBalance, type BalanceEntry } from "./balance";
import { formatPhone, normalizePhone, phoneForWhatsApp } from "./phone";
import { buildUpiLink, buildWhatsAppLink, firstName, isValidVpa, renderTemplate, DEFAULT_TEMPLATES } from "./reminders/messages";
import { parseCsv, toCsv } from "./csv";

describe("paise formatting", () => {
  it("uses Indian digit grouping", () => {
    expect(groupIndian("1")).toBe("1");
    expect(groupIndian("999")).toBe("999");
    expect(groupIndian("1000")).toBe("1,000");
    expect(groupIndian("123456")).toBe("1,23,456");
    expect(groupIndian("12345678")).toBe("1,23,45,678");
  });

  it("formats paise as rupees", () => {
    expect(formatPaise(0)).toBe("₹0");
    expect(formatPaise(5)).toBe("₹0.05");
    expect(formatPaise(50)).toBe("₹0.50");
    expect(formatPaise(12345600)).toBe("₹1,23,456");
    expect(formatPaise(12345650)).toBe("₹1,23,456.50");
    expect(formatPaise(-50000)).toBe("-₹500");
    expect(formatPaise(150000, { symbol: false })).toBe("1,500");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatPaise(10.5)).toThrow();
  });

  it("gives plain decimals for machines", () => {
    expect(paiseToDecimal(12345)).toBe("123.45");
    expect(paiseToDecimal(100)).toBe("1.00");
    expect(paiseToDecimal(7)).toBe("0.07");
  });

  it("parses typed rupee amounts without float errors", () => {
    expect(parseRupeesToPaise("500")).toBe(50000);
    expect(parseRupeesToPaise("0.1")).toBe(10);
    expect(parseRupeesToPaise("0.29")).toBe(29);
    expect(parseRupeesToPaise("1,250.75")).toBe(125075);
    expect(parseRupeesToPaise("₹ 1,250")).toBe(125000);
    expect(parseRupeesToPaise("12.")).toBe(1200);
    expect(parseRupeesToPaise(42)).toBe(4200);
    expect(parseRupeesToPaise("1.234")).toBeNull();
    expect(parseRupeesToPaise("-5")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("")).toBeNull();
  });
});

describe("due date logic", () => {
  it("falls on the last day of shorter months", () => {
    expect(dueDateInMonth(2026, 11, 31)).toBe("2026-11-30");
    expect(dueDateInMonth(2026, 2, 31)).toBe("2026-02-28");
    expect(dueDateInMonth(2028, 2, 30)).toBe("2028-02-29"); // leap year
    expect(dueDateInMonth(2026, 2, 29)).toBe("2026-02-28");
    expect(dueDateInMonth(2026, 12, 31)).toBe("2026-12-31");
    expect(dueDateInMonth(2026, 4, 10)).toBe("2026-04-10");
  });

  it("finds the next due date on or after today", () => {
    expect(nextDueDate(10, "2026-11-05")).toBe("2026-11-10");
    expect(nextDueDate(10, "2026-11-10")).toBe("2026-11-10");
    expect(nextDueDate(10, "2026-11-11")).toBe("2026-12-10");
    expect(nextDueDate(31, "2026-11-26")).toBe("2026-11-30");
    expect(nextDueDate(31, "2027-01-31")).toBe("2027-01-31");
    expect(nextDueDate(31, "2027-02-01")).toBe("2027-02-28");
    expect(nextDueDate(5, "2026-12-20")).toBe("2027-01-05");
  });

  it("finds the last due date that has passed", () => {
    expect(lastPassedDueDate(10, "2026-11-11")).toBe("2026-11-10");
    expect(lastPassedDueDate(10, "2026-11-10")).toBe("2026-10-10");
    expect(lastPassedDueDate(31, "2026-03-01")).toBe("2026-02-28");
    expect(lastPassedDueDate(15, "2027-01-03")).toBe("2026-12-15");
  });

  it("does date arithmetic", () => {
    expect(daysBetween("2026-11-26", "2026-11-30")).toBe(4);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(shiftYearMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftYearMonth("2026-12", 1)).toBe("2027-01");
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(formatDayMonth("2026-11-05", "en")).toBe("5 Nov");
    expect(formatDayMonth("2025-11-05", "en", "2026-01-01")).toBe("5 Nov 2025");
  });

  it("computes today in the shop's time zone", () => {
    // 20:00 UTC on 26 Nov is already 27 Nov in India
    expect(todayIn("Asia/Kolkata", new Date("2026-11-26T20:00:00Z"))).toBe("2026-11-27");
    expect(todayIn("Asia/Kolkata", new Date("2026-11-26T10:00:00Z"))).toBe("2026-11-26");
  });
});

describe("balance calculation", () => {
  const e = (type: "credit" | "payment", amount: number, entryDate = "2026-11-01", deletedAt: string | null = null): BalanceEntry => ({
    type,
    amount,
    entryDate,
    deletedAt,
  });

  it("is credits minus payments, ignoring deleted entries", () => {
    expect(computeBalance([])).toBe(0);
    expect(computeBalance([e("credit", 50000), e("credit", 25050), e("payment", 30000)])).toBe(45050);
    expect(computeBalance([e("credit", 50000), e("payment", 50000, "2026-11-02", "2026-11-03T00:00:00Z")])).toBe(50000);
    expect(computeBalance([e("payment", 10000)])).toBe(-10000);
  });

  it("gives a running balance per entry", () => {
    const rows = withRunningBalance([e("credit", 100), e("credit", 200, "2026-11-01", "x"), e("payment", 50), e("credit", 25)]);
    expect(rows.map((r) => r.runningBalance)).toEqual([100, 50, 75]);
  });

  it("counts only unpaid credit from before the due date as overdue", () => {
    // 1000 taken before due date, 300 paid, 500 taken after: overdue 700
    expect(computeOverdue(100000, 30000, 120000)).toBe(70000);
    // paid more than old credit: nothing overdue
    expect(computeOverdue(100000, 120000, 50000)).toBe(0);
    // never more than the balance
    expect(computeOverdue(100000, 0, 40000)).toBe(40000);
  });

  it("derives a status", () => {
    expect(customerStatus(-100, 0, 3)).toBe("advance");
    expect(customerStatus(0, 0, 3)).toBe("paid");
    expect(customerStatus(500, 200, 20)).toBe("overdue");
    expect(customerStatus(500, 0, 7)).toBe("soon");
    expect(customerStatus(500, 0, 8)).toBe("normal");
  });
});

describe("phone numbers", () => {
  it("normalises Indian mobiles to +91", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("098765-43210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("919876543210")).toBe("+919876543210");
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("5876543210")).toBeNull();
    expect(normalizePhone("+971501234567")).toBe("+971501234567");
  });

  it("formats for WhatsApp and display", () => {
    expect(phoneForWhatsApp("+919876543210")).toBe("919876543210");
    expect(formatPhone("+919876543210")).toBe("98765 43210");
  });
});

describe("WhatsApp message and UPI link builders", () => {
  const vars = {
    name: "Ramesh",
    amount: "₹1,250",
    dueDate: "10 Dec",
    shopName: "Sharma General Store",
    upiLink: "https://shop.example/pay/abc",
  };

  it("fills every placeholder and leaves unknown ones visible", () => {
    const text = renderTemplate("Hi {name}, {amount} due {dueDate} at {shopName}. {upiLink} {oops}", vars);
    expect(text).toBe("Hi Ramesh, ₹1,250 due 10 Dec at Sharma General Store. https://shop.example/pay/abc {oops}");
    for (const tpl of Object.values(DEFAULT_TEMPLATES)) {
      expect(renderTemplate(tpl, vars)).not.toMatch(/\{(name|amount|dueDate|shopName|upiLink)\}/);
    }
  });

  it("builds a wa.me link with an encoded message", () => {
    const link = buildWhatsAppLink("+919876543210", "Namaste Ramesh & family\n₹1,250?");
    expect(link).toBe("https://wa.me/919876543210?text=Namaste%20Ramesh%20%26%20family%0A%E2%82%B91%2C250%3F");
    expect(decodeURIComponent(link.split("text=")[1])).toBe("Namaste Ramesh & family\n₹1,250?");
  });

  it("builds a UPI link with amount in rupees", () => {
    expect(buildUpiLink({ vpa: "sharma@okaxis", payeeName: "Sharma Store", amountPaise: 125050, note: "Udhar Nov" })).toBe(
      "upi://pay?pa=sharma%40okaxis&pn=Sharma%20Store&am=1250.50&cu=INR&tn=Udhar%20Nov",
    );
    expect(buildUpiLink({ vpa: "a@b", payeeName: "S & S", amountPaise: 100 })).toBe("upi://pay?pa=a%40b&pn=S%20%26%20S&am=1.00&cu=INR");
  });

  it("validates UPI IDs and trims names", () => {
    expect(isValidVpa("sharma.store@okaxis")).toBe(true);
    expect(isValidVpa("9876543210@ybl")).toBe(true);
    expect(isValidVpa("no-at-sign")).toBe(false);
    expect(isValidVpa("a@1bank")).toBe(false);
    expect(firstName("  Ramesh Kumar Gupta ")).toBe("Ramesh");
  });
});

describe("csv", () => {
  it("parses quotes, commas and newlines", () => {
    expect(parseCsv('name,phone\n"Gupta, Ram",9876543210\r\n"He said ""hi""",\n')).toEqual([
      ["name", "phone"],
      ["Gupta, Ram", "9876543210"],
      ['He said "hi"', ""],
    ]);
  });

  it("round-trips and guards against spreadsheet formulas", () => {
    const text = toCsv([["a", "b,c"], ["=SUM(A1)", 'x"y']]);
    expect(text).toBe('a,"b,c"\r\n\'=SUM(A1),"x""y"\r\n');
    expect(parseCsv(text)).toEqual([["a", "b,c"], ["'=SUM(A1)", 'x"y']]);
  });
});
