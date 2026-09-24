import { ReportTemplate, ReportTemplateId } from "../../domain/model/report-template/report-template.js";
import { TemplateLayout } from "../../domain/model/report-template/template-layout.js";
import { ReportTemplateRepository } from "../../domain/ports/report-template-repository.js";

export interface CreateReportTemplateInput {
  name: string;
  sections: string[];
  theme: "light" | "dark" | "custom";
  showLogo: boolean;
}

export class CreateReportTemplateUseCase {
  constructor(private readonly templateRepository: ReportTemplateRepository) {}

  public async execute(input: CreateReportTemplateInput): Promise<ReportTemplate> {
    const layout = TemplateLayout.create({
      sections: input.sections,
      theme: input.theme,
      showLogo: input.showLogo,
    });

    const templateId = ReportTemplateId.generate();
    const template = ReportTemplate.create(templateId, input.name, layout);

    await this.templateRepository.save(template);

    return template;
  }
}
