import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import {
  CreateAssignmentDto,
  CreateAssignmentDtoSchema,
} from "./dto/create-assignment.dto";
import {
  UpdateAssignmentDto,
  UpdateAssignmentDtoSchema,
} from "./dto/update-assignment.dto";
import {
  AssignmentEntity,
  AssignmentEntitySchema,
} from "./entities/assignment.entity";

export default async function (server: FastifyInstance) {
  server.get("/", {
    schema: {
      response: { 200: Type.Array(AssignmentEntitySchema) },
    },
    async handler(): Promise<AssignmentEntity[]> {
      const data = await server.assignmentService.findAll({});
      return data.map((d) => new AssignmentEntity(d));
    },
  });

  const ParamsSchema = Type.Object({ id: Type.Number() });
  type Params = Static<typeof ParamsSchema>;
  server.get<{ Params: Params }>("/:id", {
    schema: {
      params: ParamsSchema,
      response: { 200: AssignmentEntitySchema },
    },
    async handler({ params: { id } }): Promise<AssignmentEntity> {
      const data = await server.assignmentService.findOne({ id });
      return new AssignmentEntity(data);
    },
  });

  server.post<{ Body: CreateAssignmentDto }>("/", {
    schema: {
      body: CreateAssignmentDtoSchema,
      response: { 201: AssignmentEntitySchema },
    },
    async handler({ body }, reply): Promise<AssignmentEntity> {
      const { classId, feedbackCategoryIds, ...rest } = body;
      const data = await server.assignmentService.create({
        class: { connect: { id: classId } },
        feedbackCategories: {
          connect: feedbackCategoryIds.map((id) => ({ id })),
        },
        ...rest,
      });
      reply.code(201);
      return new AssignmentEntity(data);
    },
  });

  server.patch<{ Params: Params; Body: UpdateAssignmentDto }>("/:id", {
    schema: { params: ParamsSchema, body: UpdateAssignmentDtoSchema },
    async handler({ params: { id }, body }): Promise<AssignmentEntity> {
      const data = await server.assignmentService.update(id, body);
      return new AssignmentEntity(data);
    },
  });

  server.delete<{ Params: Params }>("/:id", {
    schema: { params: ParamsSchema },
    async handler({ params: { id } }): Promise<AssignmentEntity> {
      const data = await server.assignmentService.delete(id);
      return new AssignmentEntity(data);
    },
  });

  server.get<{ Params: Params }>("/:id/submissions", {
    schema: { params: ParamsSchema },
    async handler({ params: { id } }): Promise<any> {
      const submittedStudents = await server.prisma.user.findMany({
        where: {
          attendingClass: {
            some: { class: { assignments: { some: { id } } } },
          },
        },
        select: {
          academicId: true,
          firstName: true,
          lastName: true,
          submissions: {
            where: { assignmentId: id, staged: false },
            include: { stagedSubmission: true },
          },
        },
      });

      return submittedStudents.map((s) => {
        const submission = s.submissions.length === 0 ? null : s.submissions[0];
        const stagedSubmission = submission?.stagedSubmission || null;

        return {
          academicId: s.academicId,
          submissionId: stagedSubmission?.id || null,
          firstName: s.firstName,
          lastName: s.lastName,
          isGraded: stagedSubmission?.graded || false,
          playCount: stagedSubmission?.playCount || null,
          submissionDateTime:
            stagedSubmission?.updatedDateTime.toISOString() || null,
        };
      });
    },
  });
}
