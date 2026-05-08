"use client";
import { useCallback } from "react";

/**
 * usePrint — opens a styled print window from any HTML string.
 * No external PDF libraries needed; browser PDF export via Ctrl+P works natively.
 */
export function usePrint() {
  const print = useCallback((htmlContent: string, title = "OMS — Print") => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
    body { padding: 32px 40px; max-width: 860px; margin: 0 auto; }

    /* Header */
    .print-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
    .print-header .logo { display: flex; align-items: center; gap: 10px; }
    .print-header .logo-box { width: 32px; height: 32px; background: #1a1a2e; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
    .print-header .brand-name { font-size: 16px; font-weight: 700; }
    .print-header .brand-sub  { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .08em; }
    .print-header .meta       { text-align: right; font-size: 11px; color: #555; line-height: 1.6; }

    /* Sections */
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    h3 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #555; margin: 24px 0 8px; }

    /* Badges */
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; border: 1px solid; text-transform: uppercase; letter-spacing: .04em; }
    .badge-open       { background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; }
    .badge-in_progress{ background:#fffbeb; border-color:#fde68a; color:#b45309; }
    .badge-resolved   { background:#f0fdf4; border-color:#bbf7d0; color:#15803d; }
    .badge-closed     { background:#f8fafc; border-color:#e2e8f0; color:#475569; }
    .badge-high       { background:#fef2f2; border-color:#fecaca; color:#b91c1c; }
    .badge-medium     { background:#fffbeb; border-color:#fde68a; color:#b45309; }
    .badge-low        { background:#f0fdf4; border-color:#bbf7d0; color:#15803d; }

    /* Meta grid */
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px; }
    .meta-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .meta-cell .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #888; margin-bottom: 3px; }
    .meta-cell .value { font-size: 13px; font-weight: 600; }

    /* Messages */
    .message { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; }
    .message.internal { background: #fffbeb; border-color: #fde68a; }
    .message.public   { background: #f8fafc; }
    .message-header   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
    .message-sender   { font-weight: 700; }
    .message-time     { color: #888; }
    .message-label    { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing:.05em; padding: 1px 6px; border-radius: 4px; }
    .message.internal .message-label { background:#fef3c7; color:#92400e; }
    .message.public   .message-label { background:#e0f2fe; color:#0369a1; }
    .message-body     { font-size: 12px; line-height: 1.55; color: #333; white-space: pre-wrap; }

    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }

    /* Footer */
    .print-footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; }

    @media print {
      body { padding: 20px; }
      @page { margin: 16mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="logo">
      <div class="logo-box">O</div>
      <div>
        <div class="brand-name">OMS</div>
        <div class="brand-sub">Outreach Management System</div>
      </div>
    </div>
    <div class="meta">
      <div>Printed: ${new Date().toLocaleString()}</div>
    </div>
  </div>
  ${htmlContent}
  <div class="print-footer">
    <span>OMS — Outreach Management System</span>
    <span>Confidential — Internal Use Only</span>
  </div>
</body>
</html>`);

    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }, []);

  return { print };
}
