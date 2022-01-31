import { Static, Type } from "@sinclair/typebox";

export const CreateFeedbackDtoSchema = Type.Object({
  submissionId: Type.Integer(),
  professorId: Type.Integer(),
  selectedIdx: Type.Object({ start: Type.Integer(), end: Type.Integer() }),
  selectedSourceText: Type.Boolean(),
  comment: Type.Union([Type.Null(), Type.String()]),
  categoriyIds: Type.Array(Type.Integer()),
  staged: Type.Boolean(),
});
export type CreateFeedbackDto = Static<typeof CreateFeedbackDtoSchema>;