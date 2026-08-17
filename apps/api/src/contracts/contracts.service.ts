import { Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit");

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async generatePartnerContract(partnerId: string): Promise<Buffer> {
    const org = await this.prisma.organization.findUnique({
      where: { id: partnerId },
      include: {
        partner: {
          include: {
            services: { take: 10 },
            drivers: { take: 10 },
            vehicles: { take: 10 },
          },
        },
      },
    });
    if (!org || !org.partner) throw new NotFoundException("Partner not found");

    const generatedAt = new Date();
    const contractId = `KRT-${generatedAt.getFullYear()}-${partnerId.slice(0, 8).toUpperCase()}`;

    // Digital signature payload
    const signaturePayload = {
      contractId,
      partnerId: org.id,
      legalName: org.legalName,
      generatedAt: generatedAt.toISOString(),
      settlementTerms: org.partner.settlementTerms,
    };
    const signatureHash = createHash("sha256")
      .update(JSON.stringify(signaturePayload))
      .digest("hex");

    // Build PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Partnership Contract - ${org.displayName}`,
        Author: "Kemraa Travel Platform",
        Subject: "B2B Partnership Agreement",
        Creator: "Kemraa Contract Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));

    const gold = "#C9A227";
    const darkGold = "#8B7420";
    const dark = "#0C0A06";
    const gray = "#6B7280";

    // ===== PAGE HEADER =====
    doc.rect(0, 0, 595, 80).fill(gold);

    doc.fontSize(28).fillColor(dark).font("Helvetica-Bold")
      .text("KEMRAA", 50, 25, { align: "left" });
    doc.fontSize(10).fillColor("#4A3817")
      .text("TRAVEL PLATFORM", 50, 55);

    doc.fontSize(20).fillColor(dark).font("Helvetica-Bold")
      .text("PARTNERSHIP CONTRACT", 0, 35, { align: "right", width: 545 });
    doc.fontSize(9).fillColor("#4A3817")
      .text(contractId, 0, 58, { align: "right", width: 545 });

    let y = 110;

    // ===== PARTIES SECTION =====
    doc.fontSize(14).fillColor(darkGold).font("Helvetica-Bold")
      .text("PARTIES TO THE AGREEMENT", 50, y);
    doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor(gold).lineWidth(1).stroke();
    y += 35;

    doc.fontSize(10).fillColor(gray).font("Helvetica-Bold")
      .text("FIRST PARTY (PLATFORM)", 50, y);
    doc.fontSize(11).fillColor(dark).font("Helvetica")
      .text("Kemraa Travel Platform LLC", 50, y + 14);
    doc.fontSize(9).fillColor(gray)
      .text("Licensed travel marketplace operator", 50, y + 28)
      .text("Cairo, Egypt", 50, y + 40);
    y += 60;

    doc.fontSize(10).fillColor(gray).font("Helvetica-Bold")
      .text("SECOND PARTY (PARTNER)", 50, y);
    doc.fontSize(11).fillColor(dark).font("Helvetica-Bold")
      .text(org.legalName, 50, y + 14);
    doc.fontSize(9).fillColor(gray).font("Helvetica")
      .text(`Trading as: ${org.displayName}`, 50, y + 28)
      .text(`Type: ${org.type}`, 50, y + 40)
      .text(`Country: ${org.country}`, 50, y + 52)
      .text(`Partner ID: ${org.id}`, 50, y + 64);
    y += 85;

    // ===== SCOPE =====
    doc.fontSize(14).fillColor(darkGold).font("Helvetica-Bold")
      .text("SCOPE OF PARTNERSHIP", 50, y);
    doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor(gold).lineWidth(1).stroke();
    y += 35;

    doc.fontSize(10).fillColor(dark).font("Helvetica")
      .text(`This agreement establishes a B2B partnership between Kemraa and ${org.displayName} for the provision of travel services through the Kemraa platform.`, 50, y, { width: 495, align: "justify" });
    y += 50;

    // Stats box
    const stats = {
      "Active Services": org.partner.services?.length ?? 0,
      "Registered Drivers": org.partner.drivers?.length ?? 0,
      "Fleet Vehicles": org.partner.vehicles?.length ?? 0,
      "Contract Status": org.partner.contractStatus,
    };

    doc.roundedRect(50, y, 495, 80, 6).fill("#F9F7F0").strokeColor(gold).stroke();
    doc.fontSize(9).fillColor(darkGold).font("Helvetica-Bold")
      .text("PARTNERSHIP METRICS", 60, y + 8);

    let sx = 60;
    Object.entries(stats).forEach(([label, value]) => {
      doc.fontSize(8).fillColor(gray).font("Helvetica")
        .text(label, sx, y + 25, { width: 110 });
      doc.fontSize(16).fillColor(dark).font("Helvetica-Bold")
        .text(String(value), sx, y + 38, { width: 110 });
      sx += 120;
    });
    y += 95;

    // ===== SETTLEMENT TERMS =====
    doc.fontSize(14).fillColor(darkGold).font("Helvetica-Bold")
      .text("FINANCIAL TERMS", 50, y);
    doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor(gold).lineWidth(1).stroke();
    y += 35;

    const terms = (org.partner.settlementTerms as Record<string, any>) ?? {};
    if (Object.keys(terms).length === 0) {
      doc.fontSize(10).fillColor(gray).font("Helvetica-Oblique")
        .text("Standard terms apply. Specific financial arrangements to be documented via settlement invoices.", 50, y, { width: 495 });
      y += 30;
    } else {
      Object.entries(terms).forEach(([key, value]) => {
        doc.fontSize(10).fillColor(gray).font("Helvetica-Bold")
          .text(this.humanize(key) + ":", 50, y, { continued: true });
        doc.fontSize(10).fillColor(dark).font("Helvetica")
          .text(String(value));
        y += 16;
      });
      y += 10;
    }

    // ===== DIGITAL SIGNATURE =====
    if (y > 650) { doc.addPage(); y = 50; }

    doc.fontSize(14).fillColor(darkGold).font("Helvetica-Bold")
      .text("DIGITAL SIGNATURE & VERIFICATION", 50, y);
    doc.moveTo(50, y + 20).lineTo(545, y + 20).strokeColor(gold).lineWidth(1).stroke();
    y += 35;

    doc.fontSize(9).fillColor(gray).font("Helvetica")
      .text("This contract was digitally signed using SHA-256 cryptographic hash.", 50, y, { width: 495 });
    y += 20;

    doc.roundedRect(50, y, 495, 90, 6).fill("#FFFBF0").strokeColor(darkGold).lineWidth(1.5).stroke();

    doc.fontSize(9).fillColor(darkGold).font("Helvetica-Bold")
      .text("CONTRACT HASH (SHA-256):", 60, y + 10);
    doc.fontSize(7).fillColor(dark).font("Courier")
      .text(signatureHash, 60, y + 24, { width: 475 });

    doc.fontSize(9).fillColor(darkGold).font("Helvetica-Bold")
      .text("ISSUED AT:", 60, y + 45);
    doc.fontSize(9).fillColor(dark).font("Helvetica")
      .text(generatedAt.toISOString(), 140, y + 45);

    doc.fontSize(9).fillColor(darkGold).font("Helvetica-Bold")
      .text("CONTRACT ID:", 60, y + 62);
    doc.fontSize(9).fillColor(dark).font("Helvetica")
      .text(contractId, 140, y + 62);
    y += 105;

    // ===== FOOTER =====
    const pages = doc.bufferedPageRange().count;
    for (let i = 0; i < pages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(gray).font("Helvetica")
        .text(
          `Kemraa Travel Platform — Confidential — Generated ${generatedAt.toLocaleDateString()} — Page ${i + 1} of ${pages}`,
          50, 780, { align: "center", width: 495 }
        );
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
    });
  }

  private humanize(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
}
