<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClassroomNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_notification_is_persisted_and_visible_to_classroom_students(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $student = User::factory()->create(['role' => 'student']);
        $classroom = Classroom::create([
            'teacher_id' => $teacher->id,
            'name' => 'Physics',
            'subject' => 'Physics',
            'code' => 'PHY12345',
        ]);
        $classroom->students()->attach($student->id, ['joined_at' => now()]);

        $this->actingAs($teacher)
            ->postJson("/api/classrooms/{$classroom->id}/notify", ['message' => 'Review chapter four'])
            ->assertCreated()
            ->assertJsonPath('notification.message', 'Review chapter four');

        $this->assertDatabaseHas('classroom_notifications', [
            'classroom_id' => $classroom->id,
            'message' => 'Review chapter four',
        ]);

        $this->actingAs($student)
            ->getJson("/api/classrooms/{$classroom->id}")
            ->assertOk()
            ->assertJsonPath('notifications.0.message', 'Review chapter four');
    }

    public function test_only_the_classroom_teacher_can_send_a_notification(): void
    {
        $owner = User::factory()->create(['role' => 'teacher']);
        $otherTeacher = User::factory()->create(['role' => 'teacher']);
        $classroom = Classroom::create([
            'teacher_id' => $owner->id,
            'name' => 'Biology',
            'subject' => 'Biology',
            'code' => 'BIO12345',
        ]);

        $this->actingAs($otherTeacher)
            ->postJson("/api/classrooms/{$classroom->id}/notify", ['message' => 'Unapproved message'])
            ->assertForbidden();

        $this->assertDatabaseMissing('classroom_notifications', [
            'classroom_id' => $classroom->id,
            'message' => 'Unapproved message',
        ]);
    }
}
