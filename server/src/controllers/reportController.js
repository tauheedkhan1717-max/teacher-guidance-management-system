import { prisma } from "../lib/prisma.js";
import PdfPrinter from "pdfmake";

const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js', // Simplified, requires proper font loading in real env, using standard Helvetica
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js'
  }
};

export async function getStudentReport(req, res, next) {
  try {
    let studentId = req.params.studentId;
    if (studentId === "me") {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile) return res.status(404).json({ error: { message: "Profile not found." } });
      studentId = profile.id;
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true, progressEntries: { where: { isDeleted: false } } }
    });
    if (!student) return res.status(404).json({ error: { message: "Student not found." } });

    const tableBody = [
      ['Title', 'Type', 'Marks', 'Max', 'Remark']
    ];
    student.progressEntries.forEach(entry => {
      tableBody.push([
        entry.title,
        entry.type,
        entry.marksObtained != null ? entry.marksObtained.toString() : '-',
        entry.maxMarks != null ? entry.maxMarks.toString() : '-',
        entry.remark || ''
      ]);
    });

    const docDefinition = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'Student Report Card', fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
        { text: `Name: ${student.user.name}`, margin: [0, 5] },
        { text: `Roll Number: ${student.rollNumber}`, margin: [0, 5] },
        { text: 'Progress Entries:', bold: true, margin: [0, 15, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', '*'],
            body: tableBody
          }
        }
      ]
    };

    const printer = new PdfPrinter({
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    });

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${student.rollNumber}.pdf"`);
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (err) {
    next(err);
  }
}
