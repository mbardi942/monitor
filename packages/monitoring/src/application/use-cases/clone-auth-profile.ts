import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";
import { AuthProfile } from "../../domain/model/auth-profile/auth-profile.js";

export interface CloneAuthProfileInput {
  sourceId: string;
  targetDashboardId: string;
  newName?: string;
}

export class CloneAuthProfileUseCase {
  constructor(private readonly authProfileRepository: AuthProfileRepository) {}

  public async execute(input: CloneAuthProfileInput): Promise<AuthProfile> {
    const sourceId = AuthProfileId.create(input.sourceId);
    const source = await this.authProfileRepository.findById(sourceId);

    if (!source) {
      throw new Error(`Profilo di autenticazione di origine con ID ${input.sourceId} non trovato.`);
    }

    const cloned = source.cloneForDashboard(input.targetDashboardId, input.newName);
    await this.authProfileRepository.save(cloned);
    return cloned;
  }
}
