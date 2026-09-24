import { AuthProfileRepository } from "../../domain/ports/auth-profile-repository.js";
import { AuthProfileId } from "../../domain/model/auth-profile/auth-profile-id.js";

export interface DeleteAuthProfileInput {
  id: string;
}

export class DeleteAuthProfileUseCase {
  constructor(private readonly authProfileRepository: AuthProfileRepository) {}

  public async execute(input: DeleteAuthProfileInput): Promise<void> {
    const id = AuthProfileId.create(input.id);
    await this.authProfileRepository.delete(id);
  }
}
