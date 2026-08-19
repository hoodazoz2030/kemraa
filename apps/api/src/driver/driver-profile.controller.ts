import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Req, Param, SetMetadata, Logger } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RolesGuard } from "../common/guards/roles.guard.js";
import { Audit } from "../common/interceptors/audit.interceptor.js";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * §18 — Driver profile + status management.
 */
@ApiTags("driver-profile")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("driver-profile")
export class DriverProfileController {
  private readonly logger = new Logger(DriverProfileController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get driver profile.
   */
  @Get()
  @SetMetadata("roles", ["DRIVER"])
  async get(@Req() req: any) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId: req.user.sub },
      include: {
        user: { select: { id: true, email: true, phone: true } },
        vehicles: true,
        partner: true,
      },
    });
    if (!driver) return { error: { code: "DRIVER_NOT_FOUND" } };
    return driver;
  }

  /**
   * Update driver profile (licenseRef, etc.).
   */
  @Patch()
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.update_profile", "driver")
  async update(@Req() req: any, @Body() body: { licenseRef?: string; partnerId?: string }) {
    const data: any = {};
    if (body.licenseRef !== undefined) data.licenseRef = body.licenseRef;
    if (body.partnerId !== undefined) data.partnerId = body.partnerId;

    return await this.prisma.driver.update({
      where: { userId: req.user.sub },
      data,
    });
  }

  /**
   * Submit for verification (UNVERIFIED → PENDING).
   */
  @Post("verify")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.submit_verification", "driver")
  async submitVerification(@Req() req: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: req.user.sub } });
    if (!driver) return { error: { code: "DRIVER_NOT_FOUND" } };
    if (driver.verificationStatus !== "UNVERIFIED" && driver.verificationStatus !== "REJECTED") {
      return { error: { code: "INVALID_STATE", message: `Status is ${driver.verificationStatus}` } };
    }

    return await this.prisma.driver.update({
      where: { userId: req.user.sub },
      data: { verificationStatus: "PENDING" as any },
    });
  }

  /**
   * Go online (OFFLINE → ONLINE).
   */
  @Post("online")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.go_online", "driver")
  async goOnline(@Req() req: any) {
    const driver = await this.prisma.driver.findUnique({ where: { userId: req.user.sub } });
    if (!driver) return { error: { code: "DRIVER_NOT_FOUND" } };
    if (!["VERIFIED", "PENDING"].includes(driver.verificationStatus)) {
      return { error: { code: "NOT_VERIFIED", message: "Must be APPROVED to go online" } };
    }
    if (driver.status === "SUSPENDED") {
      return { error: { code: "SUSPENDED" } };
    }

    return await this.prisma.driver.update({
      where: { userId: req.user.sub },
      data: { status: "ONLINE" as any },
    });
  }

  /**
   * Go offline (ONLINE/BUSY → OFFLINE).
   */
  @Post("offline")
  @SetMetadata("roles", ["DRIVER"])
  @Audit("driver.go_offline", "driver")
  async goOffline(@Req() req: any) {
    return await this.prisma.driver.update({
      where: { userId: req.user.sub },
      data: { status: "OFFLINE" as any },
    });
  }
}
