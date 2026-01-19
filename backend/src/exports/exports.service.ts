import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExportQueryDto, ExportFormat } from './dto';
import { TransactionStatus, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';
//import * as PDFDocument from 'pdfkit';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async exportTransactions(
    organizationId: string,
    userId: string,
    query: ExportQueryDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    await this.checkPermission(organizationId, userId, [Role.OWNER, Role.ADMIN, Role.TREASURER]);

    const dateFilter: any = {};
    if (query.startDate || query.endDate) {
      dateFilter.transactionDate = {};
      if (query.startDate) dateFilter.transactionDate.gte = query.startDate;
      if (query.endDate) dateFilter.transactionDate.lte = query.endDate;
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        organizationId,
        status: TransactionStatus.COMPLETED,
        ...dateFilter,
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
        paymentMethod: true,
        createdBy: true,
      },
      orderBy: { transactionDate: 'desc' },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    await this.auditService.log({
      action: 'EXPORT',
      module: 'exports',
      entityType: 'Transaction',
      userId,
      organizationId,
      metadata: { format: query.format, count: transactions.length },
    });

    const format = query.format || ExportFormat.CSV;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format) {
      case ExportFormat.CSV:
        return this.generateCSV(transactions, org?.name || 'export', timestamp);
      case ExportFormat.XLSX:
        return this.generateXLSX(transactions, org?.name || 'export', timestamp);
      case ExportFormat.PDF:
        return this.generatePDF(transactions, org?.name || 'export', timestamp);
      default:
        return this.generateCSV(transactions, org?.name || 'export', timestamp);
    }
  }

  private generateCSV(transactions: any[], orgName: string, timestamp: string) {
    const headers = [
      'Fecha', 'Tipo', 'Monto', 'Moneda', 'Descripción', 'Referencia',
      'Categoría', 'Cuenta Origen', 'Cuenta Destino', 'Método de Pago', 'Creado Por',
    ];

    const rows = transactions.map(t => [
      t.transactionDate.toISOString().split('T')[0],
      t.type,
      (Number(t.amount) / 100).toFixed(2),
      t.currency,
      t.description || '',
      t.reference || '',
      t.category?.name || '',
      t.fromAccount?.name || '',
      t.toAccount?.name || '',
      t.paymentMethod?.name || '',
      t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `${orgName}-transacciones-${timestamp}.csv`,
      contentType: 'text/csv',
    };
  }

  private async generateXLSX(transactions: any[], orgName: string, timestamp: string) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transacciones');

    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Tipo', key: 'type', width: 10 },
      { header: 'Monto', key: 'amount', width: 12 },
      { header: 'Moneda', key: 'currency', width: 8 },
      { header: 'Descripción', key: 'description', width: 30 },
      { header: 'Referencia', key: 'reference', width: 15 },
      { header: 'Categoría', key: 'category', width: 15 },
      { header: 'Cuenta Origen', key: 'fromAccount', width: 15 },
      { header: 'Cuenta Destino', key: 'toAccount', width: 15 },
      { header: 'Método de Pago', key: 'paymentMethod', width: 15 },
      { header: 'Creado Por', key: 'createdBy', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    transactions.forEach(t => {
      worksheet.addRow({
        date: t.transactionDate.toISOString().split('T')[0],
        type: t.type,
        amount: Number(t.amount) / 100,
        currency: t.currency,
        description: t.description || '',
        reference: t.reference || '',
        category: t.category?.name || '',
        fromAccount: t.fromAccount?.name || '',
        toAccount: t.toAccount?.name || '',
        paymentMethod: t.paymentMethod?.name || '',
        createdBy: t.createdBy ? `${t.createdBy.firstName} ${t.createdBy.lastName}` : '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      filename: `${orgName}-transacciones-${timestamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private generatePDF(transactions: any[], orgName: string, timestamp: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `${orgName}-transacciones-${timestamp}.pdf`,
          contentType: 'application/pdf',
        });
      });

      // Header
      doc.fontSize(20).text(`Reporte de Transacciones`, { align: 'center' });
      doc.fontSize(12).text(orgName, { align: 'center' });
      doc.fontSize(10).text(`Generado: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Summary
      const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);

      doc.fontSize(12).text(`Total Ingresos: $${(totalIncome / 100).toFixed(2)}`);
      doc.text(`Total Egresos: $${(totalExpense / 100).toFixed(2)}`);
      doc.text(`Balance Neto: $${((totalIncome - totalExpense) / 100).toFixed(2)}`);
      doc.text(`Total Transacciones: ${transactions.length}`);
      doc.moveDown(2);

      // Table header
      doc.fontSize(10).text('Fecha | Tipo | Monto | Descripción | Categoría', { underline: true });
      doc.moveDown();

      // Table rows (simplified for PDF)
      transactions.slice(0, 50).forEach(t => {
        const line = `${t.transactionDate.toISOString().split('T')[0]} | ${t.type} | $${(Number(t.amount) / 100).toFixed(2)} | ${(t.description || '').substring(0, 20)} | ${t.category?.name || '-'}`;
        doc.fontSize(8).text(line);
      });

      if (transactions.length > 50) {
        doc.moveDown();
        doc.text(`... y ${transactions.length - 50} transacciones más`);
      }

      doc.end();
    });
  }

  private async checkPermission(orgId: string, userId: string, roles?: Role[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    });
    if (!membership?.isActive) throw new ForbiddenException('Not a member');
    if (roles && !roles.includes(membership.role)) throw new ForbiddenException('Insufficient permissions');
  }
}
