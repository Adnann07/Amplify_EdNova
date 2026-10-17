from manim import *

config.background_color = BLACK

class Scene(MovingCameraScene):
    def construct(self):
        # Title Card
        title = Text("Cell Division", font_size=60, color=YELLOW)
        self.play(Write(title))
        self.wait(2)
        self.play(FadeOut(title))
        self.wait(1)

        # Introduction: Single Cell
        intro_text = Text("Life begins with a single cell", font_size=36).to_edge(UP)
        single_cell = Circle(radius=1.5, color=BLUE)
        single_cell_label = Text("Single cell", font_size=24).next_to(single_cell, DOWN)
        self.play(Write(intro_text))
        self.play(Create(single_cell), Write(single_cell_label))
        self.wait(3)
        self.play(FadeOut(intro_text))
        self.wait(1)

        # Step 1: Cell Growth
        growth_text = Text("The cell grows", font_size=36).to_edge(UP)
        self.play(Write(growth_text))
        grown_cell = Circle(radius=2, color=BLUE)
        grown_cell_label = Text("Grown cell", font_size=24).next_to(grown_cell, DOWN)
        self.play(Transform(single_cell, grown_cell), FadeOut(single_cell_label), Write(grown_cell_label))
        self.wait(3)
        self.play(FadeOut(growth_text))
        self.wait(1)

        # Step 2: DNA Replication
        replication_text = Text("DNA replication", font_size=36).to_edge(UP)
        self.play(Write(replication_text))
        self.camera.frame.move_to(single_cell)
        self.camera.frame.scale(0.7)

        dna_strand1 = Line(start=-LEFT*1, end=LEFT*1, color=RED)
        dna_strand2 = Line(start=-LEFT*1, end=LEFT*1, color=GREEN).rotate(PI/2)
        dna_helix = VGroup(dna_strand1, dna_strand2)
        dna_helix.move_to(single_cell.get_center())

        dna_label = Text("DNA", font_size=24).next_to(dna_helix, DOWN)

        self.play(FadeIn(dna_helix), Write(dna_label))
        self.wait(2)

        new_dna_strand1 = dna_strand1.copy().set_color(ORANGE)
        new_dna_strand2 = dna_strand2.copy().set_color(PURPLE).rotate(PI/2)
        new_dna_helix = VGroup(new_dna_strand1, new_dna_strand2)
        new_dna_helix.move_to(single_cell.get_center())

        arrow_replication = Arrow(single_cell.get_center() + UP * 1.5, single_cell.get_center() + UP * 2.5, color=YELLOW)
        replication_arrow_label = Text("Replication", font_size=20, color=YELLOW).next_to(arrow_replication, UP)

        self.play(
            dna_helix.animate.shift(LEFT * 0.5),
            new_dna_helix.animate.shift(RIGHT * 0.5),
            Write(replication_arrow_label),
            GrowArrow(arrow_replication)
        )
        self.wait(3)
        self.play(FadeOut(replication_text, dna_helix, dna_label, new_dna_helix, arrow_replication, replication_arrow_label))
        self.wait(1)

        # Step 3: Chromosome Condensation
        condensation_text = Text("Chromosomes condense", font_size=36).to_edge(UP)
        self.play(Write(condensation_text))
        self.camera.frame.move_to(ORIGIN)
        self.camera.frame.scale(1)

        condensed_chromosomes = VGroup()
        for _ in range(4):
            chromosome = Square(side_length=0.5, color=TEAL, stroke_width=3)
            chromosome.set_x(random.uniform(-3, 3))
            chromosome.set_y(random.uniform(-2, 2))
            condensed_chromosomes.add(chromosome)

        chromosome_labels = VGroup(*[Text("Chromosome", font_size=18).next_to(c, DOWN) for c in condensed_chromosomes])

        self.play(
            FadeOut(grown_cell, grown_cell_label),
            FadeIn(condensed_chromosomes),
            Write(chromosome_labels)
        )
        self.wait(3)
        self.play(FadeOut(condensation_text))
        self.wait(1)

        # Step 4: Mitosis - Prophase & Metaphase
        mitosis_text = Text("Mitosis: Prophase and Metaphase", font_size=36).to_edge(UP)
        self.play(Write(mitosis_text))

        # Prophase
        spindle_fibers = VGroup()
        for chromo in condensed_chromosomes:
            spindle_fibers.add(Line(start=chromo.get_center(), end=chromo.get_center() + UP*2, color=WHITE))
            spindle_fibers.add(Line(start=chromo.get_center(), end=chromo.get_center() + DOWN*2, color=WHITE))

        chromosome_alignment_arrow = Arrow(condensed_chromosomes.get_center() + LEFT * 2, condensed_chromosomes.get_center() + RIGHT * 2, color=YELLOW)
        alignment_label = Text("Align at the metaphase plate", font_size=24, color=YELLOW).next_to(chromosome_alignment_arrow, UP)

        self.play(FadeIn(spindle_fibers), GrowArrow(chromosome_alignment_arrow), Write(alignment_label))
        self.wait(3)

        # Step 5: Mitosis - Anaphase & Telophase
        anaphase_telophase_text = Text("Mitosis: Anaphase and Telophase", font_size=36).to_edge(UP)
        self.play(ReplacementTransform(mitosis_text, anaphase_telophase_text))

        separated_chromosomes = VGroup()
        for i, chromo in enumerate(condensed_chromosomes):
            new_chromo = chromo.copy()
            if i % 2 == 0:
                new_chromo.shift(UP * 2)
            else:
                new_chromo.shift(DOWN * 2)
            separated_chromosomes.add(new_chromo)

        split_arrow = Arrow(condensed_chromosomes.get_center(), condensed_chromosomes.get_center() + DOWN, color=RED)
        split_label = Text("Division", font_size=24, color=RED).next_to(split_arrow, DOWN)

        self.play(
            FadeOut(spindle_fibers),
            FadeOut(chromosome_labels),
            FadeOut(chromosome_alignment_arrow),
            FadeOut(alignment_label),
            ReplacementTransform(condensed_chromosomes, separated_chromosomes),
            GrowArrow(split_arrow),
            Write(split_label)
        )
        self.wait(3)
        self.play(FadeOut(anaphase_telophase_text, split_arrow, split_label))
        self.wait(1)

        # Step 6: Two Daughter Cells
        two_cells_text = Text("Two new cells form", font_size=36).to_edge(UP)
        self.play(Write(two_cells_text))

        cell_membrane = Circle(radius=2, color=GREEN, fill_opacity=0.5)
        cell_membrane.move_to(ORIGIN)

        daughter_cell1 = Circle(radius=1.2, color=BLUE).shift(LEFT * 2)
        daughter_cell1_label = Text("Cell 1", font_size=24).next_to(daughter_cell1, DOWN)
        daughter_cell2 = Circle(radius=1.2, color=BLUE).shift(RIGHT * 2)
        daughter_cell2_label = Text("Cell 2", font_size=24).next_to(daughter_cell2, DOWN)

        self.play(
            FadeOut(separated_chromosomes),
            Create(cell_membrane),
            Transform(daughter_cell1, Circle(radius=1.2, color=BLUE).shift(LEFT * 2)),
            Transform(daughter_cell2, Circle(radius=1.2, color=BLUE).shift(RIGHT * 2)),
            Write(daughter_cell1_label),
            Write(daughter_cell2_label)
            )
        self.wait(3)
        self.play(FadeOut(two_cells_text))
        self.wait(1)

        # Summary
        summary_text = Text("One cell becomes two new cells", font_size=48, color=GOLD).to_edge(UP)
        self.play(Write(summary_text))

        final_arrow = Arrow(daughter_cell1.get_center(), daughter_cell2.get_center(), color=YELLOW)
        final_arrow_label = Text("The process continues", font_size=24, color=YELLOW).next_to(final_arrow, UP)

        self.play(
            FadeOut(daughter_cell1, daughter_cell1_label),
            FadeOut(daughter_cell2, daughter_cell2_label),
            FadeOut(cell_membrane),
            GrowArrow(final_arrow),
            Write(final_arrow_label)
        )
        self.wait(4)

        self.play(
            FadeOut(summary_text),
            FadeOut(final_arrow),
            FadeOut(final_arrow_label)
        )
        self.wait(3)