import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfile } from "../../domain/model/auth-profile/auth-profile.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";
import { AuthProfileType } from "../../domain/model/auth-profile/auth-profile-type.js";

export interface UpdateAuthProfileInput {
  id: string;
  name?: string;
  type?: AuthProfileType;
  data?: Record<string, any>;
}

export class UpdateAuthProfileUseCase {
  constructor(private readonly authProfileRepository: AuthProfileRepository) {}

  public async execute(input: UpdateAuthProfileInput): Promise<AuthProfile> {
    const id = AuthProfileId.create(input.id);
    const profile = await this.authProfileRepository.findById(id);

    if (!profile) {
      throw new Error(`Profilo di autenticazione con ID ${input.id} non trovato.`);
    }

    profile.update({
      name: input.name,
      type: input.type,
      data: input.data,
    });

    await this.authProfileRepository.save(profile);
    return profile;
  }
}
