import { Role } from "@prisma/client";
import { Static, Type } from "@sinclair/typebox";

export const CreateUserDtoSchema = Type.Object({
  academicId: Type.String(),
  firstName: Type.String(),
  lastName: Type.String(),
  email: Type.String(),
  password: Type.String(),
  departmentId: Type.Integer(),
  role: Type.Enum(Role),
});
export type CreateUserDto = Static<typeof CreateUserDtoSchema>;