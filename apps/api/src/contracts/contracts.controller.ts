import { Controller, Get, Param, Res, UseGuards, ParseUUIDPipe } from "@nestjs/common";
import { Response } from "express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard, Roles } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { ContractsService } from "./contracts.service.js";

@ApiTags("contracts")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("contracts")
export class ContractsController {
  constructor(private readonly svc: ContractsService) {}

  @Get("partners/:id/pdf")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("contract.download", "contract")
  async downloadPartnerContract(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.svc.generatePartnerContract(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="kemraa-contract-${id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }

  @Get("settlements/:id/invoice")
  @Roles("SUPER_ADMIN", "ADMIN")
  @Audit("invoice.download", "invoice")
  async downloadInvoice(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.svc.generateInvoice(id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="kemraa-invoice-${id.slice(0, 8)}.pdf"`);
    res.send(pdf);
  }
}
