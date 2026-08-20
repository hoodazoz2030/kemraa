import { Controller, Get, Param, Req, UseGuards, ParseUUIDPipe, BadRequestException, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PartnerGuard } from "../common/guards/partner.guard.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { Response } from "express";

@ApiTags("partner-contracts")
@ApiBearerAuth()
@UseGuards(PartnerGuard)
@Controller("partner-contracts")
export class PartnerContractsController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== 1. List signing requests (§11 - no internal data leak) =====
  @Get()
  async list(@Req() req: any) {
    const items = await this.prisma.signingRequest.findMany({
      where: { partnerId: req.partnerUser.partnerId },
      select: {
        id: true, contractType: true, status: true,
        signerName: true, signerEmail: true, signerTitle: true,
        sentAt: true, viewedAt: true, signedAt: true, completedAt: true, expiresAt: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return { items };
  }

  // ===== 2. Detail (§11 - safe fields only) =====
  @Get(":id")
  async detail(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string) {
    const sr = await this.prisma.signingRequest.findFirst({
      where: { id, partnerId: req.partnerUser.partnerId },
      select: {
        id: true, contractType: true, status: true,
        signerName: true, signerEmail: true, signerTitle: true,
        sentAt: true, viewedAt: true, signedAt: true, completedAt: true, expiresAt: true,
        contractHash: true,
        metadata: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!sr) throw new BadRequestException({ code: "NOT_FOUND" });
    return sr;
  }

  // ===== 3. Download PDF (proxy to contracts controller) =====
  @Get(":id/pdf")
  async downloadPdf(@Req() req: any, @Param("id", new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const sr = await this.prisma.signingRequest.findFirst({ where: { id, partnerId: req.partnerUser.partnerId } });
    if (!sr) throw new BadRequestException({ code: "NOT_FOUND" });

    // Re-use the existing contracts PDF generator
    const contract = await this.prisma.partner.findUnique({ where: { organizationId: req.partnerUser.partnerId }, include: { organization: true } });
    if (!contract) throw new BadRequestException({ code: "PARTNER_NOT_FOUND" });

    // Simple PDF placeholder - in production this would call the existing contracts service
    const pdfBuffer = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF`);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contract-${sr.id.substring(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  }
}
