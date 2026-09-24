import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfile } from "../../domain/model/auth-profile/auth-profile.js";
import { AuthProfileType } from "../../domain/model/auth-profile/auth-profile-type.js";

export interface CreateAuthProfileInput {
  dashboardId: string;
  name: string;
  type: AuthProfileType;
  data: Record<string, any>;
}

export class CreateAuthProfileUseCase {
  constructor(private readonly authProfileRepository: AuthProfileRepository) {}

  public async execute(input: CreateAuthProfileInput): Promise<AuthProfile> {
    const profile = AuthProfile.create({
      dashboardId: input.dashboardId,
      name: input.name,
      type: input.type,
      data: input.data,
    });

    await this.authProfileRepository.save(profile);
    return profile;
  }
}
