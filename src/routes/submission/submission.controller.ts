import { Prisma } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { NotFound } from "http-errors";
import {
  CreateSubmissionDto,
  CreateSubmissionDtoSchema,
} from "./dto/create-submission.dto";
import {
  UpdateManySubmissionDto,
  UpdateManySubmissionDtoSchema,
  UpdateSubmissionDto,
  UpdateSubmissionDtoSchema,
} from "./dto/update-submission.dto";
import {
  SubmissionEntity,
  SubmissionEntitySchema,
} from "./entities/submission.entity";

export default async function (server: FastifyInstance) {
  server.get("/", {
    schema: {
      response: { 200: Type.Array(SubmissionEntitySchema) },
    },
    async handler(): Promise<SubmissionEntity[]> {
      const data = await server.submissionService.findAll({});
      return data.map((d) => new SubmissionEntity(d));
    },
  });

  const ParamsSchema = Type.Object({ id: Type.Number() });
  type Params = Static<typeof ParamsSchema>;
  server.get<{ Params: Params }>("/:id", {
    schema: {
      params: ParamsSchema,
      response: { 200: SubmissionEntitySchema },
    },
    async handler({ params: { id } }): Promise<SubmissionEntity> {
      const data = await server.submissionService.findOne({ id });
      if (!data) throw new NotFound("Submission not found");
      return new SubmissionEntity(data);
    },
  });

  server.post<{ Body: CreateSubmissionDto }>("/", {
    schema: {
      body: CreateSubmissionDtoSchema,
      response: { 201: SubmissionEntitySchema },
    },
    async handler({ body }, reply): Promise<SubmissionEntity> {
      const { studentId, assignmentId, ...rest } = body;
      const data = await server.submissionService.create({
        ...rest,
        student: { connect: { id: studentId } },
        assignment: { connect: { id: assignmentId } },
      });
      reply.code(201);
      return new SubmissionEntity(data);
    },
  });

  server.get<{ Params: Params }>("/:id/audio", {
    schema: {
      params: ParamsSchema,
      headers: { 200: { "Content-Type": "audio/webm" } },
    },
    async handler({ params: { id } }) {
      const data = await server.prisma.submission.findUnique({
        where: { id },
        select: { audioFile: true },
      });
      if (!data?.audioFile) throw new NotFound("Audiofile doesn't exist");

      return data.audioFile;
    },
  });

  server.post<{ Params: Params; Body: any }>("/:id/audio", {
    schema: { params: ParamsSchema },
    async handler({ params, body }) {
      await server.submissionService.update(params.id, {
        audioFile: await body.audioFile.toBuffer(),
      });
      return { ok: true };
    },
  });

  server.post<{ Params: Params }>("/:id/stage", {
    schema: { params: ParamsSchema },
    async handler({ params: { id } }, _reply) {
      const draft = await server.submissionService.findOne({ id });
      if (!draft) throw new NotFound("Submission not found");

      const {
        id: draftId,
        assignmentId,
        studentId,
        stagedSubmissionId,
        textFile,
        audioFile,
        sequentialRegions,
        playCount,
        playbackRate,
      } = draft;
      if (stagedSubmissionId) {
        return await server.submissionService.update(stagedSubmissionId, {
          textFile,
          audioFile,
          sequentialRegions: sequentialRegions ?? Prisma.JsonNull,
          playCount,
          playbackRate,
        });
      } else {
        return await server.submissionService.create({
          assignment: { connect: { id: assignmentId } },
          student: { connect: { id: studentId } },
          draftSubmission: { connect: { id: draftId } },
          staged: true,
          textFile,
          audioFile,
          sequentialRegions: sequentialRegions ?? Prisma.JsonNull,
          playCount,
          playbackRate,
        });
      }
    },
  });

  server.patch<{ Params: Params; Body: UpdateSubmissionDto }>("/:id", {
    schema: { params: ParamsSchema, body: UpdateSubmissionDtoSchema },
    async handler({
      params: { id },
      body: { sequentialRegions, ...rest },
    }): Promise<SubmissionEntity> {
      const data = await server.submissionService.update(id, {
        sequentialRegions: sequentialRegions ?? Prisma.JsonNull,
        ...rest,
      });
      return new SubmissionEntity(data);
    },
  });

  server.patch<{ Body: UpdateManySubmissionDto }>("/batch", {
    schema: { body: UpdateManySubmissionDtoSchema },
    async handler({ body: { ids, dto } }): Promise<{ count: number }> {
      return await server.submissionService.updateMany(ids, dto);
    },
  });

  server.delete<{ Params: Params }>("/:id", {
    schema: { params: ParamsSchema },
    async handler({ params: { id } }): Promise<SubmissionEntity> {
      const data = await server.submissionService.delete(id);
      return new SubmissionEntity(data);
    },
  });
}
