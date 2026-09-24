import { ValueObject } from "@monitor/shared-kernel";

export interface TemplateLayoutProps {
  sections: string[]; // Es: ["metrics", "charts", "details", "notes"]
  theme: "light" | "dark" | "custom";
  showLogo: boolean;
}

export class TemplateLayout extends ValueObject<TemplateLayoutProps> {
  public get sections(): string[] {
    return [...this.props.sections];
  }

  public get theme(): "light" | "dark" | "custom" {
    return this.props.theme;
  }

  public get showLogo(): boolean {
    return this.props.showLogo;
  }

  public static create(props: TemplateLayoutProps): TemplateLayout {
    if (props.sections.length === 0) {
      throw new Error("Template layout must contain at least one section.");
    }
    return new TemplateLayout(props);
  }

  public static createDefault(): TemplateLayout {
    return new TemplateLayout({
      sections: ["metrics", "details"],
      theme: "light",
      showLogo: true,
    });
  }

  public toValue(): TemplateLayoutProps {
    return {
      sections: this.sections,
      theme: this.theme,
      showLogo: this.showLogo,
    };
  }
}
