/**
 * Development seed data.
 *
 * Creates one admin, one staff user, three agents and a spread of paid and
 * unpaid tickets so every screen has something realistic to show. Credentials
 * are documented in the README and are for local development only — the
 * script refuses to run against NODE_ENV=production unless explicitly forced.
 */
import { PrismaClient, AuditAction, AuditEntity, Role, TicketStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@atoz.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2024";
const STAFF_EMAIL = process.env.SEED_STAFF_EMAIL ?? "staff@atoz.local";
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? "StaffPass!2024";

function daysAgo(days: number, hour = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 15, 0, 0);
  return d;
}

const money = (value: number) => new Prisma.Decimal(value.toFixed(2));

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error(
      "Refusing to seed a production database. Set SEED_ALLOW_PRODUCTION=true to override.",
    );
  }

  console.log("Seeding A TO Z — Agent Management System…");

  await prisma.systemSettings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      agencyName: "A TO Z Travel",
      defaultCurrency: "SDG",
      timezone: "Africa/Khartoum",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      name: "A TO Z Administrator",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: STAFF_EMAIL },
    update: { role: Role.STAFF, isActive: true },
    create: {
      name: "Operations Desk",
      email: STAFF_EMAIL,
      passwordHash: await bcrypt.hash(STAFF_PASSWORD, 12),
      role: Role.STAFF,
    },
  });

  const agentSeeds = [
    {
      code: "TH001",
      name: "Travel Hub",
      phone: "+249 91 234 5678",
      email: "accounts@travelhub.example",
      notes: "Primary partner agency in Khartoum. Settles weekly by bank transfer.",
    },
    {
      code: "AGB002",
      name: "Agent B",
      phone: "+249 92 876 5432",
      email: "finance@agentb.example",
      notes: "Corporate travel accounts. Payment terms: 14 days.",
    },
    {
      code: "AGC003",
      name: "Agent C",
      phone: "+249 90 555 1122",
      email: "office@agentc.example",
      notes: "Seasonal umrah and hajj bookings.",
    },
    {
      code: "NLB004",
      name: "Nile Bridge Tours",
      phone: "+249 91 777 3344",
      email: "hello@nilebridge.example",
      notes: "New partner — onboarding in progress.",
    },
  ];

  const agents = [];
  for (const seed of agentSeeds) {
    agents.push(
      await prisma.agent.upsert({
        where: { code: seed.code },
        update: {},
        create: seed,
      }),
    );
  }

  const [travelHub, agentB, agentC, nileBridge] = agents;

  // pnr, agent, amount, days ago created, transaction number (null = unpaid),
  // days ago paid.
  const ticketSeeds: Array<{
    pnr: string;
    agentId: string;
    amount: number;
    createdDaysAgo: number;
    txn: string | null;
    paidDaysAgo?: number;
  }> = [
    { pnr: "ABC123", agentId: travelHub.id, amount: 1_250_000, createdDaysAgo: 8, txn: "4827", paidDaysAgo: 6 },
    { pnr: "XY77KP", agentId: agentB.id, amount: 850_000, createdDaysAgo: 9, txn: null },
    { pnr: "QR4821", agentId: travelHub.id, amount: 2_400_000, createdDaysAgo: 21, txn: "1904", paidDaysAgo: 15 },
    { pnr: "MK9931", agentId: travelHub.id, amount: 3_100_000, createdDaysAgo: 34, txn: null },
    { pnr: "LP2244", agentId: travelHub.id, amount: 975_000, createdDaysAgo: 3, txn: null },
    { pnr: "ZT6610", agentId: agentB.id, amount: 1_680_000, createdDaysAgo: 27, txn: "7350", paidDaysAgo: 20 },
    { pnr: "BN0092", agentId: agentB.id, amount: 540_000, createdDaysAgo: 41, txn: null },
    { pnr: "HG7781", agentId: agentC.id, amount: 4_250_000, createdDaysAgo: 16, txn: "2286", paidDaysAgo: 11 },
    { pnr: "WD3390", agentId: agentC.id, amount: 1_120_000, createdDaysAgo: 6, txn: null },
    { pnr: "RS8845", agentId: agentC.id, amount: 780_000, createdDaysAgo: 52, txn: "9013", paidDaysAgo: 44 },
    { pnr: "TU1177", agentId: travelHub.id, amount: 1_890_000, createdDaysAgo: 12, txn: "5561", paidDaysAgo: 5 },
    { pnr: "VC5502", agentId: agentB.id, amount: 2_050_000, createdDaysAgo: 2, txn: null },
    { pnr: "JD4419", agentId: nileBridge.id, amount: 660_000, createdDaysAgo: 5, txn: null },
    { pnr: "EF2038", agentId: travelHub.id, amount: 1_430_000, createdDaysAgo: 63, txn: "3374", paidDaysAgo: 58 },
    { pnr: "OP9964", agentId: agentC.id, amount: 2_760_000, createdDaysAgo: 45, txn: "6628", paidDaysAgo: 38 },
    { pnr: "GH5513", agentId: agentB.id, amount: 1_340_000, createdDaysAgo: 74, txn: "8802", paidDaysAgo: 66 },
    { pnr: "KL7726", agentId: travelHub.id, amount: 3_580_000, createdDaysAgo: 88, txn: "1157", paidDaysAgo: 80 },
    { pnr: "AS3081", agentId: agentC.id, amount: 920_000, createdDaysAgo: 1, txn: null },
  ];

  for (const seed of ticketSeeds) {
    const existing = await prisma.ticket.findFirst({
      where: { agentId: seed.agentId, pnr: seed.pnr },
    });
    if (existing) continue;

    const createdAt = daysAgo(seed.createdDaysAgo);
    const creator = seed.createdDaysAgo % 2 === 0 ? admin : staff;

    const ticket = await prisma.ticket.create({
      data: {
        agentId: seed.agentId,
        pnr: seed.pnr,
        amount: money(seed.amount),
        currency: "SDG",
        status: seed.txn ? TicketStatus.PAID : TicketStatus.UNPAID,
        createdBy: creator.id,
        createdAt,
        updatedAt: createdAt,
      },
      include: { agent: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: creator.id,
        action: AuditAction.CREATE_TICKET,
        entityType: AuditEntity.TICKET,
        entityId: ticket.id,
        summary: `Created ticket ${ticket.pnr} for ${ticket.agent.name}`,
        newValues: {
          pnr: ticket.pnr,
          agent: ticket.agent.name,
          amount: seed.amount.toFixed(2),
          currency: "SDG",
          status: ticket.status,
        },
        createdAt,
      },
    });

    if (seed.txn) {
      const paidAt = daysAgo(seed.paidDaysAgo ?? Math.max(0, seed.createdDaysAgo - 2), 14);
      const payer = seed.createdDaysAgo % 3 === 0 ? staff : admin;

      const payment = await prisma.payment.create({
        data: {
          ticketId: ticket.id,
          transactionNumber: seed.txn,
          amount: money(seed.amount),
          currency: "SDG",
          paidBy: payer.id,
          paidAt,
          createdAt: paidAt,
        },
      });

      await prisma.auditLog.createMany({
        data: [
          {
            userId: payer.id,
            action: AuditAction.CREATE_PAYMENT,
            entityType: AuditEntity.PAYMENT,
            entityId: payment.id,
            summary: `Recorded payment ${seed.txn} for ticket ${ticket.pnr} (${ticket.agent.name})`,
            newValues: {
              pnr: ticket.pnr,
              agent: ticket.agent.name,
              amount: seed.amount.toFixed(2),
              currency: "SDG",
              transactionNumber: seed.txn,
              paidAt: paidAt.toISOString(),
            },
            createdAt: paidAt,
          },
          {
            userId: payer.id,
            action: AuditAction.MARK_TICKET_PAID,
            entityType: AuditEntity.TICKET,
            entityId: ticket.id,
            summary: `Marked ${ticket.pnr} as PAID — transaction ${seed.txn}`,
            oldValues: { status: "UNPAID", transactionNumber: null },
            newValues: { status: "PAID", transactionNumber: seed.txn },
            createdAt: paidAt,
          },
        ],
      });
    }
  }

  const [agentCount, ticketCount, paymentCount] = await Promise.all([
    prisma.agent.count(),
    prisma.ticket.count(),
    prisma.payment.count(),
  ]);

  console.log(`  agents:   ${agentCount}`);
  console.log(`  tickets:  ${ticketCount}`);
  console.log(`  payments: ${paymentCount}`);
  console.log("");
  console.log("Development sign-in:");
  console.log(`  ADMIN  ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`  STAFF  ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log("Change these before deploying anywhere real.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
