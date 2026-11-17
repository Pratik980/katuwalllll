// // src/components/RecentActivity.jsx
// import { Link } from 'react-router-dom';
// import { formatDistanceToNow } from 'date-fns';

// const RecentActivity = ({ title, items, type }) => {
//   if (!items || items.length === 0) {
//     return (
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//         <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
//         <p className="text-gray-500 text-center py-8">No recent {type}s</p>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//       <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
//       <div className="space-y-3">
//         {items.map((item) => (
//           <div key={item._id} className="flex items-center space-x-3">
//             {item.photo && (
//               <img
//                 src={item.photo}
//                 alt={item.name}
//                 className="h-10 w-10 rounded-full object-cover"
//               />
//             )}
//             <div className="flex-1 min-w-0">
//               <Link
//                 to={type === 'member' ? `/members/${item._id}` : `/donations/${item._id}`}
//                 className="text-sm font-medium text-gray-900 hover:text-primary truncate"
//               >
//                 {item.name || item.donor?.name || 'Anonymous'}
//               </Link>
//               <p className="text-xs text-gray-500">
//                 {formatDistanceToNow(new Date(item.createdAt || item.date), {
//                   addSuffix: true,
//                 })}
//               </p>
//             </div>
//             {type === 'donation' && (
//               <span className="text-sm font-semibold text-primary">
//                 Rs. {item.amount?.toLocaleString()}
//               </span>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default RecentActivity;
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = ({ title, items, type }) => {
  if (!items || items.length === 0) {
    return (
      <section className="dashboard-surface p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-800">{title}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Latest</span>
        </div>
        <div className="flex min-h-40 flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
            <span className="text-lg">{type === 'member' ? '○' : '＋'}</span>
          </div>
          <p className="text-sm font-medium text-slate-600">Nothing to show yet</p>
          <p className="mt-1 text-xs text-slate-400">New {type} activity will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-surface p-5 sm:p-6">
      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-800">{title}</h2>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Latest</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item._id} className="flex items-center gap-3 py-3.5 first:pt-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-100">
              {item.photo ? (
                <img
                  src={item.photo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (item.name || item.donorName || 'A').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link
                to={type === 'member' ? `/profile/${item._id}` : '/donations'}
                className="block truncate text-[13px] font-semibold text-slate-800 transition-colors hover:text-emerald-700"
              >
                {item.name || item.donorName || 'Anonymous'}
              </Link>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatDistanceToNow(new Date(item.createdAt || item.date || item.donationDate), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {type === 'donation' && (
              <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
                Rs. {(item.amount || 0).toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RecentActivity;