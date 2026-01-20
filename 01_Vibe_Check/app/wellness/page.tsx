import WellnessChat from '@/components/WellnessChat';

export default function WellnessPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          🌿 Holistic Wellness Assistant
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Get personalized mental health support and exercise recommendations
        </p>
        <WellnessChat />
      </div>
    </main>
  );
}
