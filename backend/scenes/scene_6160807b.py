from manim import *

config.background_color = BLACK

class Scene(MovingCameraScene):
    def construct(self):
        title = Text("Cell Division").scale(0.7)
        self.play(Write(title))
        self.wait(1)
        self.play(FadeOut(title))

        mitosis_text = Text("Mitosis", font_size=60)
        self.play(Write(mitosis_text))
        self.wait(1)
        self.play(FadeOut(mitosis_text))

        cell = Circle(radius=1, color=WHITE)
        nucleus = Circle(radius=0.3, color=BLUE)
        cell.add(nucleus)
        self.play(Create(cell))
        self.wait(1)

        chromosomes = VGroup(*[Dot(radius=0.05, color=YELLOW).move_to(nucleus.get_center() + np.array([x*0.1, y*0.1, 0])) for x in [-2, -1, 1, 2] for y in [-2, -1, 1, 2]])
        self.play(FadeIn(chromosomes, scale=3))
        self.wait(1)

        arrow1 = Arrow(cell.get_right(), cell.get_right() + RIGHT * 0.5, buff=0.2, color=GREEN)
        text1 = Text("Growth", font_size=24).next_to(arrow1, RIGHT)
        self.play(GrowArrow(arrow1), Write(text1))
        self.wait(1)
        self.play(FadeOut(arrow1, text1))

        arrow2 = Arrow(cell.get_top(), cell.get_top() + UP * 0.5, buff=0.2, color=RED)
        text2 = Text("DNA Replication", font_size=24).next_to(arrow2, UP)
        self.play(GrowArrow(arrow2), Write(text2))
        self.wait(1)
        self.play(FadeOut(arrow2, text2))

        new_chromosomes = VGroup(*[Dot(radius=0.05, color=YELLOW).move_to(nucleus.get_center() + np.array([x*0.1, y*0.1, 0])) for x in [-2, -1, 1, 2] for y in [-2, -1, 1, 2]])
        new_chromosomes.set_color(RED)
        self.play(Transform(chromosomes, new_chromosomes))
        self.wait(1)
        self.play(FadeOut(chromosomes))

        divided_cell1 = Circle(radius=0.7, color=WHITE).move_to(LEFT*1.5)
        divided_cell2 = Circle(radius=0.7, color=WHITE).move_to(RIGHT*1.5)
        nucleus1 = Circle(radius=0.2, color=BLUE).move_to(divided_cell1.get_center())
        nucleus2 = Circle(radius=0.2, color=BLUE).move_to(divided_cell2.get_center())
        divided_cell1.add(nucleus1)
        divided_cell2.add(nucleus2)
        self.play(FadeOut(cell, shift=LEFT),
                  FadeIn(divided_cell1, shift=LEFT),
                  FadeIn(divided_cell2, shift=RIGHT))
        self.wait(1)

        self.play(FadeOut(divided_cell1), FadeOut(divided_cell2))
        final_text = Text("New cells form!", font_size=40, color=GREEN)
        self.play(Write(final_text))
        self.wait(2)