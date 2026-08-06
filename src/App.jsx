import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './modules/dashboard/Dashboard'
import HealthDashboard from './modules/dashboard/HealthDashboard'
import Tasks from './modules/tasks/Tasks'
import Training from './modules/training/Training'
import Nutrition from './modules/nutrition/Nutrition'
import Finance from './modules/finance/Finance'
import Habits from './modules/habits/Habits'
import Planner from './modules/planner/Planner'
import Initiatives from './modules/initiatives/Initiatives'
import WeightTracker from './modules/progress/WeightTracker'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index            element={<Dashboard />} />
        <Route path="health"    element={<HealthDashboard />} />
        <Route path="tasks"     element={<Tasks />} />
        <Route path="training"  element={<Training />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="finance"   element={<Finance />} />
        <Route path="habits"    element={<Habits />} />
        <Route path="planner"   element={<Planner />} />
        <Route path="initiatives" element={<Initiatives />} />
        <Route path="weight"    element={<WeightTracker />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
